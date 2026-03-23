const UNSPLASH_CURATED: Record<string, string[]> = {
  "real-estate": [
    "1600596542815-ffad4c1539a9", "1600585154340-be6161a56a0c", "1512917774080-9991f1c4c750",
    "1570129477492-45c003edd2be", "1560448204-e02f11c3d0e2", "1560185127-6ed189bf02f4",
    "1600047509807-ba8f99d2cdde", "1613490493805-fb2f38522ce7", "1580587771525-78b9dba3b914",
  ],
  "restaurant": [
    "1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0", "1466978913421-dad2ebd01d17",
    "1555396273-367ea4eb4db5", "1504674900247-0877df9cc836", "1476224203421-9ac39bcb3327",
    "1559339352-11d035aa65de", "1424847651672-bf20a4b0982b", "1551218808-94e220e084d2",
  ],
  "medical": [
    "1631815588090-d4bfec5b1ccb", "1576091160550-2173dba999ef", "1559757148-5c0e3c080f6f",
    "1538108774489-694c72ca15ef", "1584820927498-cfe5211fd8bf", "1631217868264-e5b90bb7e133",
    "1504813184591-01572f98c85f", "1579684385127-1ef15d508118", "1551076805-e1869033e561",
  ],
  "technology": [
    "1518770660439-4636190af475", "1550751827-4bd374c3f58b", "1519389950473-47ba0277781c",
    "1531297484001-80022131f4a1", "1461749280684-dccba630e2f6", "1488590528505-98d2b5aba04b",
    "1504384308013-4f36f07f1a78", "1555949963-aa79dcee981c", "1517694712202-14dd9538aa97",
  ],
  "ecommerce": [
    "1441986300917-64674bd600d8", "1472851294608-062f824d29cc", "1556742049-0cfed4f6a45d",
    "1558618666-fcd25c85f7aa", "1607082349566-187342175e2f", "1523275335684-37898b6baf30",
    "1483985988355-763728e1935b", "1560472354-e1527abcfc1d", "1445205170230-053b83016050",
  ],
  "education": [
    "1524178232363-1fb2b075b655", "1503676260728-1c00da094a0b", "1427504494785-3a9ca7044f45",
    "1523580846011-d3a5bc25702b", "1522071820081-009f0129c71c", "1509062522246-3755977927d7",
    "1481627834876-b7833e8f5570", "1501504905252-473c47e087f8", "1531482615713-2aab69e1d9ac",
  ],
  "fitness": [
    "1534438327276-14e5300c3a48", "1571019614242-c5c5dee9f50c", "1517836357463-d25dfeac3438",
    "1583454110551-21f2fa2afe61", "1549060279-7e168fcee0c2", "1581009146145-b5ef050c2e1e",
    "1526506118085-60ce8714f8c5", "1518611012118-696072aa579a", "1576678927484-cc907957088c",
  ],
  "travel": [
    "1488646953014-85cb44e25828", "1507525428034-b723cf961d3e", "1501785888108-9e92fb7d6c5a",
    "1476514525535-07fb3b4ae5f1", "1530789253388-582c481c54b0", "1502602898657-3e91760cbb34",
    "1499856871958-5b9627545d1a", "1473625247510-8ceb1760943f", "1469854523086-cc02fe5d8800",
  ],
  "beauty": [
    "1540555700478-4be289fbec6f", "1522337360788-8b13dee7a37e", "1556228578-8c89e6adf883",
    "1570172619644-dfd03ed5d881", "1596755389378-c31d21fd1273", "1487412947147-5cebf100ffc2",
    "1512290923902-8a9f81dc236c", "1560750588-73207b1ef5b8", "1598440947619-2c35fc9aa908",
  ],
  "construction": [
    "1504307651254-35680f356dfd", "1541888946425-d81bb19240f5", "1503387762-592deb58ef4e",
    "1517089596392-fb9962f29224", "1531834685032-c34bf0d84c77", "1486406146926-c627a92ad1ab",
    "1590644607948-08b27dec4b23", "1513467535987-db81dd0b42d0", "1489171084589-9b5031ebcf9b",
  ],
  "wedding": [
    "1519741497674-611481863552", "1507003211169-0a1dd7228f2d", "1464366400600-7168b8af9bc3",
    "1529636798458-92182e662485", "1511285560929-80b456fea0bc", "1505236858219-8359eb29e329",
    "1519225421980-715cb0215aed", "1469371670807-013ccf25f16a", "1478146059778-26028b07395a",
  ],
  "food": [
    "1504674900247-0877df9cc836", "1476224203421-9ac39bcb3327", "1482049016688-2d3874f37e76",
    "1504754524776-8f4f37790ca0", "1565299624946-b28f40a0ae38", "1565958011703-44f9829ba187",
    "1540189549336-e6e99c3679fe", "1498837167922-ddd27525d352", "1567620905862-fe2e4a8b4f8e",
  ],
  "business": [
    "1497366216548-37526070297c", "1497215842964-222b430dc094", "1556761175-5973dc0f32e7",
    "1507679799987-c73779587ccf", "1553877522-43269d4ea984", "1573164574511-73c773193279",
    "1521737604893-d14cc237f11d", "1556745757-8d76bdb6984b", "1542744173-8e7e91415657",
  ],
  "abstract": [
    "1557672172-298e090bd0f1", "1558591710-4b4a1ae0f04d", "1534796636912-3b95b3ab5986",
    "1550859492-d5da9d8e45f3", "1557682250-33bd709cbe85", "1553356084-58ef4a67b2a7",
    "1518640467707-6811f4a6ab73", "1579546929518-9e396f3cc809", "1550684376-efcbd6e3f031",
  ],
};

export interface SmartImageResult {
  url: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
}

export function getSmartImages(
  category: string,
  count: number = 3,
  size: { w: number; h: number } = { w: 800, h: 600 }
): SmartImageResult[] {
  const normalizedCategory = normalizeCategory(category);
  const photoIds = UNSPLASH_CURATED[normalizedCategory] || UNSPLASH_CURATED["business"];

  const shuffled = [...photoIds].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((id, i) => ({
    url: `https://images.unsplash.com/photo-${id}?w=${size.w}&h=${size.h}&fit=crop&auto=format&q=80`,
    width: size.w,
    height: size.h,
    alt: `${normalizedCategory} image ${i + 1}`,
    credit: "Unsplash",
  }));
}

export function getHeroImage(category: string): SmartImageResult {
  return getSmartImages(category, 1, { w: 1920, h: 1080 })[0];
}

export function getProductImages(category: string, count: number = 6): SmartImageResult[] {
  return getSmartImages(category, count, { w: 600, h: 600 });
}

export function getThumbnails(category: string, count: number = 4): SmartImageResult[] {
  return getSmartImages(category, count, { w: 400, h: 300 });
}

export function getAvatars(count: number = 6): SmartImageResult[] {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://i.pravatar.cc/200?img=${(i + 1) * 3}`,
    width: 200,
    height: 200,
    alt: `Team member ${i + 1}`,
    credit: "Pravatar",
  }));
}

function normalizeCategory(input: string): string {
  const lower = input.toLowerCase();
  const mapping: Record<string, string> = {
    "عقار": "real-estate", "عقاري": "real-estate", "property": "real-estate", "house": "real-estate", "apartment": "real-estate", "villa": "real-estate",
    "مطعم": "restaurant", "مقهى": "restaurant", "cafe": "restaurant", "coffee": "restaurant",
    "طب": "medical", "صح": "medical", "عياد": "medical", "clinic": "medical", "hospital": "medical", "doctor": "medical",
    "تقن": "technology", "تكنولوج": "technology", "tech": "technology", "software": "technology", "app": "technology", "startup": "technology", "saas": "technology",
    "متجر": "ecommerce", "تسوق": "ecommerce", "shop": "ecommerce", "store": "ecommerce", "product": "ecommerce",
    "تعليم": "education", "أكاديم": "education", "school": "education", "university": "education", "course": "education",
    "رياض": "fitness", "جيم": "fitness", "gym": "fitness", "workout": "fitness", "sport": "fitness",
    "سياح": "travel", "سفر": "travel", "فندق": "travel", "hotel": "travel", "tourism": "travel",
    "تجميل": "beauty", "سبا": "beauty", "salon": "beauty", "spa": "beauty",
    "بناء": "construction", "مقاول": "construction", "هندس": "construction", "engineering": "construction",
    "زفاف": "wedding", "عرس": "wedding", "حفل": "wedding", "event": "wedding",
    "طعام": "food", "أكل": "food", "food": "food", "menu": "food",
  };

  for (const [key, val] of Object.entries(mapping)) {
    if (lower.includes(key)) return val;
  }
  return "business";
}

export function extractImagesForPrompt(userPrompt: string, count: number = 6): string {
  const category = normalizeCategory(userPrompt);
  const heroImg = getHeroImage(category);
  const sectionImgs = getSmartImages(category, count - 1, { w: 800, h: 600 });
  const avatars = getAvatars(4);

  let prompt = `\n=== CURATED IMAGES FOR THIS PROJECT ===\n`;
  prompt += `Category detected: ${category}\n\n`;
  prompt += `Hero/Banner image (use for hero section background or main image):\n`;
  prompt += `  ${heroImg.url}\n\n`;
  prompt += `Section images (use for features, about, services, gallery):\n`;
  sectionImgs.forEach((img, i) => {
    prompt += `  ${i + 1}. ${img.url}\n`;
  });
  prompt += `\nTeam/Avatar images:\n`;
  avatars.forEach((a, i) => {
    prompt += `  ${i + 1}. ${a.url}\n`;
  });
  prompt += `\nIMPORTANT: Use these EXACT URLs in your generated code. Do NOT make up Unsplash photo IDs.\n`;
  prompt += `=== END CURATED IMAGES ===\n`;
  return prompt;
}
