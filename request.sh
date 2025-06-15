curl -X POST http://localhost:3000/generate-markmap/upload \
-H "Content-Type: multipart/form-data" \
-F "markdownFile=@/path/to/example.md" \
-F "fileType=both"  # or "html" or "svg"


curl -X POST http://localhost:3000/generate-markmap/json \
-H "Content-Type: application/json" \
-d '{
    "markdown": "# Hello World\n- Item 1\n- Item 2",
    "fileType": "both"
}'  # or "html" or "svg"