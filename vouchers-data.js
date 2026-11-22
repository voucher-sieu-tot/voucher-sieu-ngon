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
  "updated": "2026-11-22T10:17:04.673Z",
  "maintenance": {
    "enabled": false,
    "message": ""
  },
  "news": [
    {
      "id": "reerzhn1c1",
      "at": "2026-11-22T10:16:57.217Z",
      "text": "NEWUSERNOVGAMEAERBXF giảm 100K/0Đ acc mới - thợ săn. 😍😍😍"
    },
    {
      "id": "hhxtxchm2b",
      "at": "2026-11-21T17:24:57.971Z",
      "text": "Back mã người mới NEWUSERIZJ4C giảm 100K/0Đ acc mới - siêu hội shopee. Anh chị em nào chưa múc được 500k/0đ thì húp tạm nhé 🐱🐱🐱"
    },
    {
      "id": "4d6mg59oju",
      "at": "2026-11-21T15:54:49.098Z",
      "text": "Hôm nay đã có 14 bạn nhận được mã 500k/0đ, chúc mừng các bạn nheeeeee. Mong là các bạn khác cũng sẽ sớm lấy được voucher ưng ý"
    },
    {
      "id": "ze5pj4w3pw",
      "at": "2026-11-21T00:48:27.860Z",
      "text": "Chúc mọi người buổi sáng tốt lành, một ngáy săn mã thuận lợi !!!!"
    }
  ]
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
    "used": 100
  },
  {
    "platform": "shopee",
    "title": "Voucher Shopee",
    "discount": "Giảm 150k",
    "minimum": "0đ",
    "link": "https://s.shopee.vn/AKcCRapcDs",
    "used": 89,
    "featured": true
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
