git add .
git commit -m "Implement video generation API with optional author, music cleanup, and feedback"
git push

curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Success is not final, failure is not fatal.",
    "author": "Winston Churchill",
    "musicPath": "path/to/music.mp3"
  }' --output output.mp4
