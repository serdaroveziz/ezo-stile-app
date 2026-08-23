/* EZO STİLE - AI Saç Danışmanı & Üzerimde Dene Modülü v1.0 */

const AI_HAIR_MODELS_DB = [
  {
    id: 'italyan-crop',
    name: 'İtalyan Crop Fade & Dokulu Üst',
    styleCategory: 'İtalyan',
    lengthCategory: 'Kısa',
    reason: 'Yüz hatlarınızı keskinleştirir, çene ve yanak oranını mükemmel dengeler.',
    haircutDetail: 'Yanlar 1-2 numara kademeli fade, üstler 3-4 cm dokulu makas kesimi.',
    barberRecipe: 'Yanları cilt geçişli İtalyan fade yapın, tepe bölgesini dokulu tekstür makasıyla hafifletin ve öne doğru düşürün.',
    overlayColor: '#1e293b'
  },
  {
    id: 'klasik-quiff',
    name: 'Klasik Executive Quiff',
    styleCategory: 'Klasik',
    lengthCategory: 'Orta',
    reason: 'Karizmatik ve olgun bir duruş sağlar, saç kalitesini ön plana çıkarır.',
    haircutDetail: 'Yanlar subay tıraşı geçişli, üstler 6-8 cm dolgun makas kesimi.',
    barberRecipe: 'Üstleri geriye ve hafif yana taranabilecek uzunlukta bırakın, yanları makas üzeri tarak ile doğal birleştirin.',
    overlayColor: '#0f172a'
  },
  {
    id: 'modern-pompadour',
    name: 'Modern Textured Pompadour',
    styleCategory: 'Modern',
    lengthCategory: 'Orta',
    reason: 'Daha dinamik ve genç görünmenizi sağlar, sakal hattı ile harika uyum yakalar.',
    haircutDetail: 'Yanlar yüksek mid-fade, üst hacimli ve fön destekli kesim.',
    barberRecipe: 'Sakal bağlantısını 0.5 ile sıfırlayın, tepeye fön hacmi kazandıracak kademeli makas katları verin.',
    overlayColor: '#334155'
  },
  {
    id: 'sportif-buzz',
    name: 'Sportif Buzz Cut & Skin Fade',
    styleCategory: 'Sportif',
    lengthCategory: 'Kısa',
    reason: 'Bakımı son derece kolay, ferah ve sportif bir görünüm katar.',
    haircutDetail: 'Üstler 3 numara eşit, yanlar cilde kadar sıfırlanmış skin fade.',
    barberRecipe: 'Yanları sıfırdan cilt geçişli yapın, tepeyi 3 numara ile eşitleyip ön saç çizgisini ustura ile netleştirin.',
    overlayColor: '#111827'
  },
  {
    id: 'olgun-taper',
    name: 'Olgun Classic Tapered Side-Part',
    styleCategory: 'Olgun',
    lengthCategory: 'Orta',
    reason: 'Yüzü uzatmadan doğal ve beyefendi bir stil sunar.',
    haircutDetail: 'Yanlar ve ense konik taper, tepe yandan çizgisiz ayrılan makas kesimi.',
    barberRecipe: 'Ense ve kulak üstlerini konik taper ile açın, tepeyi makas ile doğal dökümlü yana taranacak boyda tutun.',
    overlayColor: '#1e293b'
  },
  {
    id: 'dogal-flow',
    name: 'Doğal Wavy Flow & Mid Taper',
    styleCategory: 'Doğal',
    lengthCategory: 'Uzun',
    reason: 'Saçın doğal dalgasını vurgular, zahmetsiz ve şık bir görünüm verir.',
    haircutDetail: 'Yanlar kulak üstü temiz, üstler 10-12 cm dökümlü makas katları.',
    barberRecipe: 'Saçın doğal dalgasını bozmadan sadece uçlardaki ağırlığı alın, şakakları doğal bırakın.',
    overlayColor: '#090d16'
  }
];

function generateAiRecommendations(style, length, pref) {
  let matched = AI_HAIR_MODELS_DB.filter(m => m.styleCategory === style || m.lengthCategory === length);
  if (matched.length < 3) {
    const remaining = AI_HAIR_MODELS_DB.filter(m => !matched.includes(m));
    matched = matched.concat(remaining);
  }
  return matched.slice(0, 3);
}

function processTryOnCanvas(userImgSrc, modelObj, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width || 400;
    canvas.height = img.height || 400;

    // Draw original face photo
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Apply realistic hairstyle gradient overlay over hair region (top 28% of head)
    const hairY = canvas.height * 0.28;
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.5, hairY * 0.5, 10,
      canvas.width * 0.5, hairY * 0.5, canvas.width * 0.45
    );
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    gradient.addColorStop(0.6, 'rgba(15, 23, 42, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.5, hairY * 0.55, canvas.width * 0.38, hairY * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw stylish AI Model Badge on canvas
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✨ EZO STİLE AI: ' + modelObj.name, 16, canvas.height - 20);

    const resultDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    if (callback) callback(resultDataUrl);
  };
  img.src = userImgSrc;
}
