# Báo cáo LaTeX - SOC AI Search

File chính:

```text
docs/report/soc-ai-search-report.tex
```

## Cách biên dịch

Báo cáo dùng tiếng Việt Unicode và font hệ thống, nên nên biên dịch bằng `xelatex`.

```bash
cd docs/report
xelatex soc-ai-search-report.tex
xelatex soc-ai-search-report.tex
```

Chạy 2 lần để cập nhật mục lục, danh mục hình và danh mục bảng.

## Việc cần cập nhật trước khi nộp

Trong phần đầu file `.tex`, sửa các biến:

```tex
\newcommand{\StudentName}{<Tên sinh viên thực hiện>}
\newcommand{\StudentEmail}{<Email sinh viên thực hiện>}
\newcommand{\MentorName}{<Tên mentor>}
\newcommand{\UnitName}{<Tên đơn vị>}
```

Các hình chính hiện được dựng bằng TikZ hoặc placeholder. Nếu muốn báo cáo đẹp hơn, thay các placeholder bằng screenshot thật của:

- Event Search page;
- Query Transparency panel;
- Aggregation chart;
- SOC Overview Dashboard;
- All Investigations page;
- GitHub Actions pass / JaCoCo report.
