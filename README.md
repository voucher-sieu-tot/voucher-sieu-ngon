# DealNest - Trang voucher Shopee & TikTok Shop

Trang tĩnh dùng HTML, CSS và JavaScript thuần, không cần cài đặt hay build. Có thể tải lên GitHub Pages để chạy. Hiện tại website chỉ hỗ trợ voucher Shopee; hỗ trợ TikTok Shop sẽ được bổ sung sau.

Trang được để trống voucher mặc định nhằm tránh hiển thị ưu đãi hoặc số liệu không có thật. Chỉ thêm voucher đang áp dụng và link tiếp thị đúng với voucher đó. Website thông báo công khai rằng có thể nhận hoa hồng; nút voucher mở chính xác link đã cấu hình, không xoay link hoặc chuyển hướng ngẫu nhiên.

## Đưa web lên GitHub Pages

1. Tạo một repository GitHub mới.
2. Tải các file trong thư mục này lên repository.
3. Vào **Settings -> Pages**; chọn **Deploy from a branch**, nhánh `main` và thư mục `/ (root)`.
4. Sau khi GitHub Pages triển khai xong, mở URL được hiển thị trong phần Pages.

## Thêm voucher thật

Mở `vouchers.js` và thêm từng đối tượng vào mảng `VOUCHERS`:

```js
{
  platform: "shopee", // "shopee" hoặc "tiktok"
  title: "Voucher Shopee",
  discount: "Giảm 50K",
  minimum: "300K", // tùy chọn
  maximum: "100K", // tùy chọn
  expires: "2026-12-31", // ngày hết hạn thật, tùy chọn
  used: 40, // phần trăm thật, tùy chọn
  tag: "ShopeeVIP", // tùy chọn
  link: "https://link-tiep-thi-cua-voucher",
  featured: true, // hiện trong mục nổi bật, tùy chọn
},
```

Chỉ điền thông tin ưu đãi, thời hạn và số liệu đã xác minh. Mỗi voucher có một `link` cụ thể; không dùng link của sản phẩm không liên quan. `link` phải bắt đầu bằng `http://` hoặc `https://`. Link không hợp lệ sẽ không tạo nút mở trang.

Không ghi `expires` nếu không có hạn dùng đã xác minh. Voucher quá hạn sẽ hiện là hết hạn. Chỉ thêm `used` nếu tỷ lệ đó là số liệu thật.

## Hình ảnh và tên website

- Đổi `SITE_NAME` trong `vouchers.js` để thay tên website.
- Đổi hình dùng chung trong `PLATFORM_IMAGES`, hoặc thêm `image: "images/ten-anh.png"` vào một voucher cụ thể.

## Công khai liên kết tiếp thị

Thông báo về liên kết tiếp thị được hiển thị trên trang. Nếu một liên kết có thể mang lại hoa hồng, hãy giữ thông báo này rõ ràng và chỉ dẫn tới đúng ưu đãi/sản phẩm liên quan. Kiểm tra điều khoản của chương trình tiếp thị liên kết trước khi đăng link.
