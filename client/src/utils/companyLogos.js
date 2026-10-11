// Reliable company & brand logos and vector marks
// Falls back to a clean category or brand initial SVG fallback rather than unrelated product images

export const BRAND_LOGOS = {
  'maruti suzuki': 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Maruti_Suzuki_logo.svg',
  'maruti': 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Maruti_Suzuki_logo.svg',
  'oneplus': 'https://upload.wikimedia.org/wikipedia/commons/f/f8/OnePlus_logo.svg',
  'hp': 'https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_630x630.png',
  'hewlett packard': 'https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_630x630.png',
  'apollo hospitals': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Apollo_Hospitals_Logo.svg/320px-Apollo_Hospitals_Logo.svg.png',
  'apollo': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Apollo_Hospitals_Logo.svg/320px-Apollo_Hospitals_Logo.svg.png',
  'indigo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IndiGo_Airlines_logo.svg/320px-IndiGo_Airlines_logo.svg.png',
  'indigo airlines': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IndiGo_Airlines_logo.svg/320px-IndiGo_Airlines_logo.svg.png',
  'samsung': 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
  'flipkart': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Flipkart_logo.svg/320px-Flipkart_logo.svg.png',
  'sbi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/SBI-logo.svg/320px-SBI-logo.svg.png',
  'state bank of india': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/SBI-logo.svg/320px-SBI-logo.svg.png',
  'apple': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  'dell': 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg',
  'lenovo': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg',
  'airtel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Bharti_Airtel_Logo.svg/320px-Bharti_Airtel_Logo.svg.png',
  'jio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Reliance_Jio_Logo_%28October_2015%29.svg/320px-Reliance_Jio_Logo_%28October_2015%29.svg.png',
  'swiggy': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Swiggy_logo.svg/320px-Swiggy_logo.svg.png',
  'zomato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Zomato_Logo.svg/320px-Zomato_Logo.svg.png',
  'amazon': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
  'tata motors': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/320px-Tata_logo.svg.png',
  'hyundai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/320px-Hyundai_Motor_Company_logo.svg.png',
  'hdfc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/320px-HDFC_Bank_Logo.svg.png',
  'hdfc bank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/320px-HDFC_Bank_Logo.svg.png',
  'icici': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/ICICI_Bank_Logo.svg/320px-ICICI_Bank_Logo.svg.png',
  'icici bank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/ICICI_Bank_Logo.svg/320px-ICICI_Bank_Logo.svg.png',
};

/**
 * Returns a matching brand/company logo URL if available.
 * If not matching, returns null so a clean branded monogram/icon can be rendered instead of unrelated product images.
 */
export function getCompanyLogo(companyName = '') {
  if (!companyName) return null;
  const clean = companyName.trim().toLowerCase();
  
  if (BRAND_LOGOS[clean]) return BRAND_LOGOS[clean];

  for (const [key, url] of Object.entries(BRAND_LOGOS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return url;
    }
  }

  return null;
}
