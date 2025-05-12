const { createCanvas, loadImage, registerFont } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const multer = require('multer');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Register Montserrat fonts (adjust paths if needed)
const fontPath = "font/Montserrat-Full-Version/Desktop Fonts/Montserrat/TTF/";
registerFont(path.join(__dirname, fontPath, 'Montserrat-Bold.ttf'), { family: 'MontserratBold' });
registerFont(path.join(__dirname, fontPath, 'Montserrat-Regular.ttf'), { family: 'MontserratRegular' });

const width = 1080;
const height = 1920;

const app = express();
app.use(express.json());

async function fetchQuote() {
  // Example API, replace with your actual quote API
  const res = await axios.get('https://api.quotable.io/random');
  return {
    text: res.data.content,
    author: res.data.author
  };
}

async function generateImage(quote, author, outputImage) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  // Dynamic font size and wrapping for quote
  let fontSize = 60;
  let lines = [];
  let maxWidth = width * 0.85;
  ctx.font = `${fontSize}px MontserratBold`;

  function wrapText(text, font, maxWidth) {
    ctx.font = font;
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    return lines;
  }

  // Reduce font size if needed to fit
  while (fontSize > 30) {
    ctx.font = `${fontSize}px MontserratBold`;
    lines = wrapText(quote, ctx.font, maxWidth);
    if (lines.length <= 5) break; // max 5 lines
    fontSize -= 4;
  }

  // Calculate vertical position for centering
  const lineHeight = fontSize * 1.2;
  let textBlockHeight = lines.length * lineHeight;
  let y = height / 2 - textBlockHeight / 2;

  // Draw quote lines
  ctx.font = `${fontSize}px MontserratBold`;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, y + i * lineHeight);
  });

  // Draw author if present
  if (author) {
    ctx.font = '40px MontserratRegular';
    ctx.fillText(`- ${author}`, width / 2, y + lines.length * lineHeight + 40);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputImage, buffer);
}

function generateVideo(bgVideo, overlayImage, musicFile, outputVideo, cb) {
  ffmpeg()
    .input(bgVideo)
    .input(overlayImage)
    .input(musicFile)
    .complexFilter([
      '[0:v][1:v] overlay=0:0:format=auto[v]'
    ])
    .outputOptions(
      '-map', '[v]',
      '-map', '2:a',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-shortest'
    )
    .on('end', () => cb(null, outputVideo))
    .on('error', (err) => cb(err))
    .save(outputVideo);
}

app.post('/generate', async (req, res) => {
  try {
    const { quote, author, musicPath } = req.body;
    if (!quote || !musicPath) {
      return res.status(400).send('Missing quote or musicPath');
    }
    const tempImage = 'temp.png';
    const bgVideo = 'bg/1080.mp4';
    const outputVideo = `output_${Date.now()}.mp4`;

    await generateImage(quote, author, tempImage);

    generateVideo(bgVideo, tempImage, musicPath, outputVideo, (err, videoPath) => {
      fs.unlinkSync(tempImage);
      if (err) {
        if (!res.headersSent) return res.status(500).send('Video generation failed');
        return;
      }
      // Send the file, then clean up
      res.download(videoPath, (downloadErr) => {
        fs.unlinkSync(videoPath);
        // Remove the music file after sending the video, only if it is in uploads/ or temp location
        try {
          if (
            musicPath.startsWith('uploads' + path.sep) ||
            musicPath.startsWith('temp' + path.sep)
          ) {
            fs.unlinkSync(musicPath);
          }
        } catch {}
        // ...do not call res.end or send another response here!
      });
    });
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).send('Error: ' + e.message);
    }
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
