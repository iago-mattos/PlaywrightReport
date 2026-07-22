#!/usr/bin/env python3
"""Gera um PDF executivo a partir de um relatório Prognum/Playwright."""

from __future__ import annotations

import html
import json
import re
import shutil
import sys
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable

from PIL import Image as PillowImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#0B2F5B")
GREEN = colors.HexColor("#15803D")
RED = colors.HexColor("#B91C1C")
AMBER = colors.HexColor("#B45309")
SLATE = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F1F5F9")
LINE = colors.HexColor("#CBD5E1")
WHITE = colors.white


def register_fonts() -> tuple[str, str]:
    candidates = [
        (
            Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
            Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        ),
        (
            Path("C:/Windows/Fonts/arial.ttf"),
            Path("C:/Windows/Fonts/arialbd.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("ReportSans", str(regular)))
            pdfmetrics.registerFont(TTFont("ReportSans-Bold", str(bold)))
            return "ReportSans", "ReportSans-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


class StatusPill(Flowable):
    def __init__(self, label: str, color: colors.Color, width: float = 31 * mm):
        super().__init__()
        self.label = label
        self.color = color
        self.width = width
        self.height = 8 * mm

    def draw(self) -> None:
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, 3 * mm, fill=1, stroke=0)
        self.canv.setFillColor(WHITE)
        self.canv.setFont(FONT_BOLD, 8)
        self.canv.drawCentredString(self.width / 2, 2.6 * mm, self.label)


def xml(value: Any) -> str:
    return html.escape(str(value or ""), quote=False).replace("\n", "<br/>")


def format_duration(milliseconds: int | float | None) -> str:
    seconds = max(0, int((milliseconds or 0) / 1000))
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes:02d}min {seconds:02d}s"
    if minutes:
        return f"{minutes}min {seconds:02d}s"
    return f"{seconds}s"


def format_datetime(value: str | None) -> str:
    if not value:
        return "Não informado"
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone().strftime("%d/%m/%Y %H:%M:%S")
    except ValueError:
        return value


def status_details(status: str) -> tuple[str, colors.Color]:
    normalized = status.lower()
    if normalized in {"passed", "expected"}:
        return "APROVADO", GREEN
    if normalized in {"failed", "unexpected"}:
        return "FALHOU", RED
    if normalized == "flaky":
        return "INSTÁVEL", AMBER
    return "IGNORADO", SLATE


def business_steps(steps: Iterable[dict[str, Any]]) -> list[tuple[int, dict[str, Any]]]:
    result: list[tuple[int, dict[str, Any]]] = []

    def visit(items: Iterable[dict[str, Any]], depth: int) -> None:
        for step in items:
            if step.get("category") != "test.step":
                continue
            result.append((depth, step))
            visit(step.get("steps", []), depth + 1)

    visit(steps, 0)
    return result


def safe_report_path(report_dir: Path, relative_path: str) -> Path | None:
    try:
        candidate = (report_dir / relative_path).resolve()
        candidate.relative_to(report_dir.resolve())
        return candidate
    except (OSError, ValueError):
        return None


def safe_evidence_data(
    path: Path, metadata_fields: dict[str, str]
) -> list[tuple[str, str]]:
    """Extrai somente os campos explicitamente permitidos na configuração."""
    if not metadata_fields:
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(payload, dict):
        return []
    return [
        (str(label), str(payload[key]))
        for key, label in metadata_fields.items()
        if key in payload
    ]


def screenshot_flowables(
    path: Path, caption: str, styles: dict[str, ParagraphStyle]
) -> list[Flowable]:
    available_width = A4[0] - 34 * mm
    available_height = A4[1] - 72 * mm
    result: list[Flowable] = []
    try:
        with PillowImage.open(path) as source:
            source.load()
            natural_width = source.width * 0.75
            display_width = min(available_width, natural_width)
            points_per_pixel = display_width / source.width
            pixels_per_part = max(1, int(available_height / points_per_pixel))
            part_count = max(1, (source.height + pixels_per_part - 1) // pixels_per_part)

            for index in range(part_count):
                top = index * pixels_per_part
                bottom = min(source.height, top + pixels_per_part)
                segment = source.crop((0, top, source.width, bottom))
                stream = BytesIO()
                segment.convert("RGB").save(
                    stream, format="JPEG", quality=90, optimize=True
                )
                stream.seek(0)
                display_height = segment.height * points_per_pixel
                part_caption = (
                    caption
                    if part_count == 1
                    else f"{caption} - parte {index + 1}/{part_count}"
                )
                result.append(
                    KeepTogether(
                        [
                            Paragraph(xml(part_caption), styles["caption"]),
                            Spacer(1, 2 * mm),
                            Image(
                                stream,
                                width=display_width,
                                height=display_height,
                            ),
                            Spacer(1, 5 * mm),
                        ]
                    )
                )
    except (OSError, ValueError):
        result.append(
            Paragraph(f"Não foi possível renderizar: {xml(caption)}", styles["muted"])
        )
    return result


def build_styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=sample["Title"],
            fontName=FONT_BOLD,
            fontSize=22,
            leading=26,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=3 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=sample["Normal"],
            fontName=FONT,
            fontSize=10,
            leading=14,
            textColor=SLATE,
            spaceAfter=6 * mm,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=sample["Heading2"],
            fontName=FONT_BOLD,
            fontSize=15,
            leading=19,
            textColor=NAVY,
            spaceBefore=4 * mm,
            spaceAfter=3 * mm,
            keepWithNext=1,
        ),
        "test": ParagraphStyle(
            "Test",
            parent=sample["Heading3"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=15,
            textColor=NAVY,
            spaceAfter=1.5 * mm,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=sample["BodyText"],
            fontName=FONT,
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1E293B"),
        ),
        "muted": ParagraphStyle(
            "Muted",
            parent=sample["BodyText"],
            fontName=FONT,
            fontSize=8,
            leading=11,
            textColor=SLATE,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=sample["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=11,
            textColor=SLATE,
            alignment=TA_CENTER,
        ),
        "step": ParagraphStyle(
            "Step",
            parent=sample["BodyText"],
            fontName=FONT,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#1E293B"),
        ),
        "error": ParagraphStyle(
            "Error",
            parent=sample["BodyText"],
            fontName=FONT,
            fontSize=8,
            leading=11,
            textColor=RED,
            backColor=colors.HexColor("#FEF2F2"),
            borderColor=colors.HexColor("#FECACA"),
            borderWidth=0.5,
            borderPadding=3 * mm,
        ),
    }


def build_pdf(payload: dict[str, Any]) -> None:
    report_dir = Path(payload["reportDir"]).resolve()
    output_path = Path(payload["outputPath"]).resolve()
    data_path = Path(payload["dataPath"]).resolve()
    data = json.loads(data_path.read_text(encoding="utf-8"))
    config = payload.get("config", {})
    pdf_config = payload.get("pdf", {})
    output_path.parent.mkdir(parents=True, exist_ok=True)

    styles = build_styles()
    report_title = str(config.get("reportTitle") or "Relatório Playwright")
    product_name = str(config.get("productName") or "Prognum Quality")
    footer_text = str(
        pdf_config.get("footerText") or f"{report_title} - Evidências da automação"
    )
    author = str(pdf_config.get("author") or product_name)

    def footer(canvas: Any, document: BaseDocTemplate) -> None:
        canvas.saveState()
        width, _ = A4
        canvas.setStrokeColor(LINE)
        canvas.line(17 * mm, 14 * mm, width - 17 * mm, 14 * mm)
        canvas.setFillColor(SLATE)
        canvas.setFont(FONT, 7.5)
        canvas.drawString(17 * mm, 9.5 * mm, footer_text)
        canvas.drawRightString(width - 17 * mm, 9.5 * mm, f"Página {document.page}")
        canvas.restoreState()

    document = BaseDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=17 * mm,
        rightMargin=17 * mm,
        topMargin=16 * mm,
        bottomMargin=19 * mm,
        title=f"{report_title} - Evidências",
        author=author,
    )
    frame = Frame(
        document.leftMargin,
        document.bottomMargin,
        document.width,
        document.height,
        id="content",
    )
    document.addPageTemplates(
        [PageTemplate(id="report", frames=[frame], onPage=footer)]
    )

    run = data.get("run", {})
    summary = data.get("summary", {})
    tests = data.get("tests", [])
    status_label, status_color = status_details(run.get("status", ""))
    screenshot_count = sum(
        1
        for test in tests
        for attachment in test.get("attachments", [])
        if attachment.get("kind") == "image"
        or str(attachment.get("contentType", "")).startswith("image/")
    )

    story: list[Flowable] = [
        Paragraph(xml(product_name), styles["subtitle"]),
        Paragraph(xml(report_title), styles["title"]),
        Paragraph(
            "Relatório executivo de execução e evidências visuais"
            f"<br/>Gerado em {xml(format_datetime(data.get('generatedAt')))}",
            styles["subtitle"],
        ),
        StatusPill(status_label, status_color),
        Spacer(1, 7 * mm),
    ]

    summary_data = [
        ["Execuções", "Aprovadas", "Falhas", "Ignoradas", "Duração", "Screenshots"],
        [
            str(run.get("total", len(tests))),
            str(summary.get("passed", 0)),
            str(summary.get("failed", 0)),
            str(summary.get("skipped", 0)),
            format_duration(run.get("duration")),
            str(screenshot_count),
        ],
    ]
    summary_table = Table(
        summary_data,
        colWidths=[document.width / 6] * 6,
        rowHeights=[8 * mm, 10 * mm],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("FONTNAME", (0, 1), (-1, 1), FONT_BOLD),
                ("FONTSIZE", (0, 0), (-1, 0), 7),
                ("FONTSIZE", (0, 1), (-1, 1), 11),
                ("TEXTCOLOR", (0, 1), (-1, 1), NAVY),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 1), (-1, 1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
            ]
        )
    )
    story.extend(
        [
            summary_table,
            Spacer(1, 4 * mm),
            Paragraph(
                f"Início: {xml(format_datetime(run.get('startedAt')))}"
                " &nbsp;&nbsp;|&nbsp;&nbsp; "
                f"Fim: {xml(format_datetime(run.get('endedAt')))}",
                styles["muted"],
            ),
            Spacer(1, 5 * mm),
            Paragraph("Resultado das execuções", styles["section"]),
        ]
    )

    metadata_fields = {
        str(key): str(label)
        for key, label in (pdf_config.get("metadataFields") or {}).items()
    }

    for test_index, test in enumerate(tests, start=1):
        test_label, test_color = status_details(
            test.get("status") or test.get("outcome", "")
        )
        header = Table(
            [
                [
                    Paragraph(f"{test_index}. {xml(test.get('title'))}", styles["test"]),
                    Paragraph(
                        f"<b>{test_label}</b><br/>{xml(format_duration(test.get('duration')))}",
                        styles["muted"],
                    ),
                ]
            ],
            colWidths=[document.width - 33 * mm, 33 * mm],
        )
        header.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                    ("LINEBEFORE", (1, 0), (1, 0), 3, test_color),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                    ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ]
            )
        )
        story.extend([header, Spacer(1, 3 * mm)])

        steps = business_steps(test.get("steps", []))
        if steps:
            step_rows: list[list[Flowable]] = []
            for depth, step in steps:
                prefix = "OK" if test_label == "APROVADO" else "-"
                title = f"{'&nbsp;' * depth * 5}{prefix} {xml(step.get('title'))}"
                step_rows.append(
                    [
                        Paragraph(title, styles["step"]),
                        Paragraph(xml(format_duration(step.get("duration"))), styles["muted"]),
                    ]
                )
            step_table = Table(
                step_rows,
                colWidths=[document.width - 25 * mm, 25 * mm],
                repeatRows=0,
            )
            step_table.setStyle(
                TableStyle(
                    [
                        (
                            "ROWBACKGROUNDS",
                            (0, 0),
                            (-1, -1),
                            [WHITE, colors.HexColor("#F8FAFC")],
                        ),
                        (
                            "LINEBELOW",
                            (0, 0),
                            (-1, -1),
                            0.25,
                            colors.HexColor("#E2E8F0"),
                        ),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                        ("TOPPADDING", (0, 0), (-1, -1), 1.5 * mm),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm),
                    ]
                )
            )
            story.extend([step_table, Spacer(1, 4 * mm)])

        errors = test.get("errors", [])
        if errors:
            message = (
                errors[0].get("message")
                if isinstance(errors[0], dict)
                else str(errors[0])
            )
            message = re.sub(
                r"\x1b\[[0-9;]*m", "", message or "Falha sem mensagem detalhada."
            )
            story.extend(
                [
                    Paragraph("Falha registrada", styles["section"]),
                    Paragraph(xml(message), styles["error"]),
                    Spacer(1, 4 * mm),
                ]
            )

        attachments = test.get("attachments", [])
        metadata_rows: list[tuple[str, str]] = []
        for attachment in attachments:
            relative_path = str(attachment.get("path", ""))
            if attachment.get("kind") != "other" or not relative_path.endswith(".json"):
                continue
            evidence_path = safe_report_path(report_dir, relative_path)
            if evidence_path:
                metadata_rows.extend(
                    safe_evidence_data(evidence_path, metadata_fields)
                )
        if metadata_rows:
            metadata_table = Table(
                [
                    [
                        Paragraph(f"<b>{xml(label)}</b>", styles["body"]),
                        Paragraph(xml(value), styles["body"]),
                    ]
                    for label, value in metadata_rows
                ],
                colWidths=[43 * mm, document.width - 43 * mm],
            )
            metadata_table.setStyle(
                TableStyle(
                    [
                        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                        ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
                        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                        ("TOPPADDING", (0, 0), (-1, -1), 1.5 * mm),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm),
                    ]
                )
            )
            story.extend(
                [
                    Paragraph("Dados da execução", styles["section"]),
                    metadata_table,
                    Spacer(1, 4 * mm),
                ]
            )

        image_attachments = [
            attachment
            for attachment in attachments
            if attachment.get("kind") == "image"
            or str(attachment.get("contentType", "")).startswith("image/")
        ]
        if image_attachments:
            image_flowables: list[Flowable] = []
            for attachment in image_attachments:
                relative_path = str(attachment.get("path", ""))
                evidence_path = safe_report_path(report_dir, relative_path)
                if evidence_path and evidence_path.exists():
                    image_flowables.extend(
                        screenshot_flowables(
                            evidence_path,
                            str(attachment.get("name") or evidence_path.name),
                            styles,
                        )
                    )
            if image_flowables:
                story.append(
                    KeepTogether(
                        [
                            Paragraph("Evidências visuais", styles["section"]),
                            image_flowables[0],
                        ]
                    )
                )
                story.extend(image_flowables[1:])
        else:
            story.extend(
                [
                    Paragraph("Evidências visuais", styles["section"]),
                    Paragraph(
                        "Nenhuma screenshot foi anexada a esta execução.",
                        styles["muted"],
                    ),
                ]
            )

        if test_index != len(tests):
            story.append(PageBreak())

    document.build(story)


def inject_download_button(
    index_path: Path,
    pdf_name: str,
    label: str,
    output_path: Path,
    web_pdf_path: Path,
) -> None:
    source = index_path.read_text(encoding="utf-8")
    safe_name = html.escape(pdf_name, quote=True)
    safe_label = html.escape(label)
    block = f"""<!-- prognum-pdf-download:start -->
    <a id="prognum-pdf-download" href="./{safe_name}" download aria-label="{safe_label}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg>
      {safe_label}
    </a>
    <style>
      #prognum-pdf-download {{ position: fixed; right: 24px; bottom: 24px; z-index: 9999; display: inline-flex;
        align-items: center; gap: 8px; padding: 11px 16px; border-radius: 10px; color: #fff;
        background: #2563eb; box-shadow: 0 10px 24px rgba(15, 23, 42, .22); font: 600 14px/1 system-ui, sans-serif;
        text-decoration: none; transition: transform .15s ease, background .15s ease; }}
      #prognum-pdf-download:hover {{ background: #1d4ed8; transform: translateY(-1px); }}
      #prognum-pdf-download:focus-visible {{ outline: 3px solid #93c5fd; outline-offset: 3px; }}
      #prognum-pdf-download svg {{ width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;
        stroke-linecap: round; stroke-linejoin: round; }}
      @media print {{ #prognum-pdf-download {{ display: none; }} }}
    </style>
<!-- prognum-pdf-download:end -->"""
    pattern = re.compile(
        r"<!-- prognum-pdf-download:start -->.*?<!-- prognum-pdf-download:end -->",
        re.DOTALL,
    )
    if pattern.search(source):
        updated = pattern.sub(block, source)
    elif "</body>" in source:
        updated = source.replace("</body>", f"{block}\n  </body>", 1)
    else:
        raise ValueError("O index.html do relatório não contém a tag </body>.")
    index_path.write_text(updated, encoding="utf-8")
    if web_pdf_path.resolve() != output_path.resolve():
        shutil.copy2(output_path, web_pdf_path)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        build_pdf(payload)
        output_path = Path(payload["outputPath"]).resolve()
        if payload.get("includeInReport", True):
            report_dir = Path(payload["reportDir"]).resolve()
            web_pdf_path = report_dir / output_path.name
            inject_download_button(
                report_dir / "index.html",
                output_path.name,
                str(payload.get("downloadLabel") or "Baixar PDF"),
                output_path,
                web_pdf_path,
            )
        print(f"Relatório PDF gerado: {output_path}")
        return 0
    except (KeyError, OSError, ValueError, TypeError, json.JSONDecodeError) as error:
        print(f"Falha ao gerar o PDF: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
