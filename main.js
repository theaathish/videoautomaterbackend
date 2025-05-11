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

  ctx.font = '60px MontserratBold';
  ctx.fillText(quote, width / 2, height / 2 - 60);

  if (author) {
    ctx.font = '40px MontserratRegular';
    ctx.fillText(`- ${author}`, width / 2, height / 2 + 60);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputImage, buffer);
}

function generateVideo(bgVideo, overlayImage, musicFile, outputVideo, cb) {
  ffmpeg()
    .input(bgVideo)
    .input(overlayImage)
    .complexFilter([
      '[0:v][1:v] overlay=0:0:format=auto'
    ])
    .input(musicFile)
    .outputOptions('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest')
    .save(outputVideo)
    .on('end', () => cb(null, outputVideo))
    .on('error', (err) => cb(err));
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
        return res.status(500).send('Video generation failed');
      }
      res.download(videoPath, () => {
        fs.unlinkSync(videoPath);
        // Remove the music file after sending the video
        try { fs.unlinkSync(musicPath); } catch {}
        // Send feedback (filename) after download
        res.end(JSON.stringify({ filename: path.basename(videoPath) }));
      });
    });
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
