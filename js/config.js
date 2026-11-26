/*
 * Барлық өзгертілетін деректер осында.
 * Всё, что может понадобиться поменять (дата, адрес, код, фото, музыка), — здесь.
 */
window.INVITE = {
  // Кодтық сөз: әр тапта бір әріп ұшып шығады
  letters: ['С', 'А', 'П', 'А'],
  // Дұрыс жауаптар (регистр, бос орын маңызды емес; латынша SAPA да өтеді)
  answers: ['САПА', 'SAPA'],
  question: 'Біздің бөлім қалай аталады?',

  // Басталу уақыты (Алматы, UTC+5)
  start: '2026-11-28T17:00:00+05:00',

  date: { big: '28 қараша', small: 'сенбі' },
  time: { big: '17:00', small: 'басталуы' },
  place: {
    big: 'Shattyq House',
    small: 'Қаскелең, Райымбек көшесі, 155',
    map: 'https://2gis.kz/almaty/geo/70000001104972067/76.619085,43.172681'
  },
  dress: { big: 'Еркін стиль', small: 'Өзіңе ыңғайлы киін' },

  music: {
    src: 'assets/music.m4a', // Just the Two of Us (алғашқы 4 минут)
    offset: 0,      // қай секундтан бастау
    volume: 0.7,    // 0…1
    fadeIn: 3       // секунд
  },

  photos: [
    { src: 'assets/photos/01-villa.jpg', caption: 'Вилла' },
    { src: 'assets/photos/02-alan.jpg', caption: 'Ашық алаң' },
    { src: 'assets/photos/03-zal.jpg', caption: '50 адамдық зал' },
    { src: 'assets/photos/04-demalys.jpg', caption: 'Демалыс бөлмесі' },
    { src: 'assets/photos/05-biliard.jpg', caption: 'Бильярд пен теннис' },
    { src: 'assets/photos/06-konak-zaly.jpg', caption: 'Қонақ залы' },
    { src: 'assets/photos/07-as-ui.jpg', caption: 'Ас үй' },
    { src: 'assets/photos/08-zhatyn.jpg', caption: 'Жатын бөлме' }
  ]
};
