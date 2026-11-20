/* DANH SÁCH VOUCHER. File này do trang admin (admin.html) tạo và cập nhật.
   Nếu sửa tay: giữ tên trường trong dấu nháy kép và không để dấu phẩy thừa ở cuối,
   nếu không trang admin sẽ không đọc được file này. */
const SITE_SETTINGS = {
  "banner": {
    "enabled": false,
    "text": "",
    "link": ""
  },
  "contact": {
    "tiktok": "https://www.tiktok.com/@livre.3636",
    "threads": "https://www.threads.com/@voucher.ngon"
  },
  "analytics": {
    "goatcounter": "ukey"
  },
  "stash": [],
  "schedule": [],
  "reportUrl": "",
  "updated": "2026-11-20T13:54:02.998Z",
  "maintenance": {
    "enabled": false,
    "message": ""
  },
  "news": []
};
const VOUCHERS = [
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 500k",
    "minimum": "0đ",
    "link": "https://s.shopee.vn/2LZwixBOBZ",
    "featured": true,
    "used": 97
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 50%",
    "minimum": "0đ",
    "maximum": "500k",
    "tag": "ShopeeVIP",
    "link": "https://s.shopee.vn/3B97mWAYN9",
    "featured": true,
    "used": 100
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 150k",
    "minimum": "0đ",
    "link": "https://s.shopee.vn/AKcCRapcDs",
    "used": 89
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 115k",
    "minimum": "0đ",
    "link": "https://s.shopee.vn/5fqOBD4siz",
    "used": 96
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 110k",
    "minimum": "0đ",
    "link": "https://s.shopee.vn/30pdCkoTpj",
    "used": 92
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 100k",
    "minimum": "0đ",
    "link": "https://s.shopee.vn/2gCn7r1t23",
    "used": 79
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 24%",
    "minimum": "250K",
    "maximum": "350K",
    "link": "https://s.shopee.vn/40iEXXqR4B",
    "used": 86
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 500k",
    "minimum": "1đ",
    "link": "https://vt.tiktok.com/ZS9PF3GM21cY3-R3s2m/",
    "featured": true,
    "used": 99
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 800k",
    "minimum": "1đ",
    "link": "https://vt.tiktok.com/ZS9PFc327k8HU-ZGf4B/",
    "featured": true,
    "used": 100
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 300k",
    "minimum": "0đ",
    "link": "https://vt.tiktok.com/ZS9PF3Hs8r8nd-HLN02/",
    "used": 85
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 200k",
    "minimum": "0đ",
    "link": "https://vt.tiktok.com/ZS9PFcGCtaFwj-48gGU/",
    "used": 98
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 100k",
    "minimum": "0đ",
    "link": "https://vt.tiktok.com/ZS9PYCuRcKkFL-Hxd1P/",
    "used": 100
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 50k",
    "minimum": "200k",
    "link": "https://vt.tiktok.com/ZS9PF3B11WLmQ-reAFg/",
    "used": 32
  },
  {
    "platform": "tiktok",
    "title": "Voucher TikTok Shop",
    "discount": "Giảm 30k",
    "minimum": "150k",
    "link": "https://vt.tiktok.com/ZS9PF3RWSqWSn-iM4QI/",
    "used": 85
  }
];
