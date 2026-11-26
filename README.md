# Сапа · Тимбилдинг 28.11

Веб-приглашение отдела Сапа: тапнуть ромб 4 раза → буквы С-А-П-А → ввести «САПА» → приглашение
(отсчёт, дата, время, адрес, дресс-код, фото места) → «ҚАТЫСУДЫ РАСТАУ» → финал.

Статический сайт без сборки (HTML + CSS + JS), хостится на GitHub Pages.

## Как поменять
- Дата, время, адрес, дресс-код, вопрос и ответ, фото, музыка — `js/config.js`.
- Тексты экранов — `index.html`, оформление — `css/style.css`.
- Музыка: `assets/music.m4a` (первые 4 минуты трека, громкость выровнена).
  Если нужна другая: `ffmpeg -i in.mp3 -t 240 -vn -af "loudnorm=I=-16,afade=t=out:st=234:d=6" -c:a aac -b:a 112k assets/music.m4a`.
- Фото: `assets/photos/*.jpg` (кадры 464×580 из видео места).

## Превью для Telegram
`assets/og.jpg` рендерится из `tools/og.html` (1200×630):

```
chrome --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=8000 --screenshot=og.png http://127.0.0.1:5173/tools/og.html
```

Telegram кэширует превью ссылки. После замены картинки отправьте ссылку боту @WebpageBot, чтобы обновить кэш.

## Локально
`python -m http.server 5173` → http://127.0.0.1:5173
