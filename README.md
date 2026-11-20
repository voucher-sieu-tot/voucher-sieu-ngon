# DealNest - Trang voucher Shopee & TikTok Shop

Trang tĩnh dùng HTML, CSS và JavaScript thuần, không cần cài đặt hay build. Có thể tải lên GitHub Pages để chạy.

Các voucher TikTok Shop và 2 voucher Shopee (giảm 50% ShopeeVIP, giảm 50k) đang dùng link tạm (trang chủ sàn): hãy thay bằng link thật trong trang admin. Chỉ thêm voucher đang áp dụng và link tiếp thị đúng với voucher đó. Website thông báo công khai rằng có thể nhận hoa hồng; nút voucher mở chính xác link đã cấu hình, không xoay link hoặc chuyển hướng ngẫu nhiên.

## Đưa web lên GitHub Pages

1. Tạo một repository GitHub mới.
2. Tải các file trong thư mục này lên repository.
3. Vào **Settings -> Pages**; chọn **Deploy from a branch**, nhánh `main` và thư mục `/ (root)`.
4. Sau khi GitHub Pages triển khai xong, mở URL được hiển thị trong phần Pages.

## Thêm voucher thật

Cách dễ nhất là dùng trang quản trị (xem mục **Trang quản trị** bên dưới). Nếu muốn sửa tay, mở `vouchers-data.js` (danh sách voucher nằm ở đây, định dạng JSON: khóa trong dấu ngoặc kép, không có dấu phẩy cuối) và thêm từng đối tượng vào mảng `VOUCHERS`:

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

## Trang quản trị (`admin.html`)

Mở `https://<tên-tài-khoản>.github.io/<tên-kho>/admin.html`. Trang này không có link công khai và đã chặn công cụ tìm kiếm. Tại đây bạn có thể sửa link từng voucher, thêm, xóa, đổi thứ tự, bật/tắt mục nổi bật, rồi bấm **Lưu & đăng lên web**. Web công khai cập nhật sau khoảng 1 đến 2 phút.

### Cài đặt lần đầu (mỗi thiết bị một lần)

1. Trên GitHub: ảnh đại diện -> **Settings** -> **Developer settings** -> **Personal access tokens** -> **Fine-grained tokens** -> **Generate new token**.
2. **Repository access**: *Only select repositories*, chọn đúng kho của web. **Permissions -> Contents**: *Read and write*. Đặt hạn dùng (ví dụ 90 ngày).
3. Sao chép khóa bắt đầu bằng `github_pat_`.
4. Mở `admin.html`, điền tên tài khoản, tên kho, nhánh (`main`), dán khóa, rồi đặt **mật khẩu** (từ 10 ký tự) và **mã PIN** (6 đến 8 số).

Những lần sau chỉ cần nhập mật khẩu + PIN.

### Bảo mật: nên hiểu đúng

- Khóa GitHub được mã hóa (PBKDF2 + AES-GCM) bằng mật khẩu và PIN trước khi lưu trong trình duyệt; chỉ nằm trong bộ nhớ khi đang mở khóa. Nhập sai 5 lần sẽ bị khóa 5 phút; không thao tác 15 phút sẽ tự khóa.
- Web tĩnh không có máy chủ, nên mật khẩu + PIN bảo vệ khóa trên thiết bị của bạn. Quyền thực sự nằm ở khóa GitHub. Khóa chỉ có quyền trên đúng một kho nên rủi ro được giới hạn.
- Mất máy hoặc nghi lộ khóa: vào GitHub xóa (Revoke) khóa đó, tạo khóa mới và cài đặt lại.
- Đổi thiết bị: cài đặt lại trên thiết bị mới. Quên mật khẩu/PIN: bấm "Quên mật khẩu / cài đặt lại" trên màn hình khóa và tạo lại khóa.
- Chỉ dùng trên thiết bị của bạn và qua `https`.

## Tính năng giao diện

- **Giao diện sáng/tối**: nút ở thanh menu, tự nhớ lựa chọn của người xem (`theme.js`).
- **Thẻ kiểu vé**: phần trên là mức giảm (nền theo sàn, ảnh sàn hoặc ảnh riêng của voucher làm hình nền mờ), phần dưới là chi tiết và nút.
- **Mục Nổi bật là dải cuộn ngang**; ở tab Tất cả, voucher nổi bật không lặp lại trong mục sàn, và có nút "Xem tất cả" để xem đủ.
- **Hộp lưu ý gập gọn**: chỉ hiện thông báo tiếp thị và đồng hồ đếm ngược, bấm "Xem lưu ý" để mở thêm.
- **Tab lọc**: Tất cả / Nổi bật / Shopee / TikTok Shop, dùng chung với ô tìm kiếm.
- **Đếm ngược khung giờ săn mã**: tính theo giờ Việt Nam, dùng các mốc 0h, 9h, 12h, 15h, 18h, 21h. Muốn đổi mốc, sửa mảng `SLOTS` trong `extras.js`.
- **Nhãn "Mới"**: tự hiện 48 giờ cho voucher bạn thêm bằng trang admin (admin tự ghi ngày thêm).
- **"Cập nhật lần cuối"**: admin tự ghi thời điểm bấm Lưu.
- **Nút "Sao chép link" / "Chia sẻ"** trên mỗi voucher còn hiệu lực. Nút "Chia sẻ" chỉ hiện trên thiết bị có hỗ trợ.
- **Hiệu ứng**: viền sáng chạy quanh thẻ nổi bật, ánh lướt khi rê chuột, vé bay ở nền. Tự tắt nếu người xem bật "giảm chuyển động" trên thiết bị.

### Banner dịp lễ và nút "Báo mã hết"

Cả hai sửa trong `admin.html`, mục **Cài đặt web** (dữ liệu nằm trong `SITE_SETTINGS` của `vouchers-data.js`):

- **Banner**: tích bật, nhập nội dung (tối đa 140 ký tự) và link tùy chọn. Tắt tích để ẩn.
- **Nút "Báo mã hết"**: web tĩnh không tự lưu được dữ liệu, nên nút này mở một biểu mẫu bên ngoài. Cách làm: tạo Google Form (ví dụ có ô "Voucher nào" và "Ghi chú"), bấm **Gửi** -> biểu tượng link -> sao chép, dán vào ô "Link biểu mẫu" trong admin. Để trống thì nút ẩn.

### Mục Liên hệ

Mục "Liên hệ" cuối trang có nút TikTok và Threads. Sửa hoặc xóa link trong `admin.html`, mục **Cài đặt web**. Để trống một ô thì nút đó ẩn; để trống cả hai thì cả mục ẩn.

### Thêm nhiều link cùng lúc

Trong `admin.html`, bấm **+ Thêm nhiều link**, dán mỗi dòng một voucher: `link | mức giảm | đơn tối thiểu` (hai phần sau có thể bỏ nếu đã điền mặc định). Link trùng với voucher đang có sẽ tự bỏ qua. Dòng đầu nằm trên cùng. Sau đó bấm **Lưu & đăng lên web**.

### Thống kê lượt xem và lượt bấm (tùy chọn)

1. Đăng ký miễn phí tại goatcounter.com, chọn một mã (ví dụ `ten-cua-ban`).
2. Dán mã đó vào ô **Mã GoatCounter** trong **Cài đặt web** của admin rồi lưu.
3. Xem số liệu tại `https://<mã>.goatcounter.com`: lượt xem trang, và mục *Events* hiển thị voucher nào được bấm "Lấy voucher".

GoatCounter không dùng cookie. Khi bật, dòng thông báo thống kê ẩn danh tự hiện ở chân trang. Muốn tắt, xóa mã trong admin.

### Đồng hồ thu nhỏ

Khi người xem cuộn xuống khỏi thanh đếm ngược chính, một đồng hồ nhỏ nổi ở góc trái màn hình, hiện giờ khung săn mã kế tiếp và thời gian còn lại. Trong "giờ vàng" nó đổi sang màu vàng. Bấm vào để thu nhỏ còn biểu tượng, bấm lại để mở rộng; lựa chọn được nhớ trên máy người xem.

### Kho lưu và hẹn giờ đổi link

Trong `admin.html`, mục **Kho lưu link & hẹn giờ đổi link**:

- **Cất vào kho**: lưu link (và mã chữ, ghi chú) chưa dùng.
- **Gán ngay**: chọn một voucher rồi gán link từ kho vào; link nào lên voucher nào do bạn chọn.
- **Hẹn giờ**: chọn voucher và giờ; đến giờ, web công khai tự dùng link mới cho voucher đó. Giờ tính theo đồng hồ của người xem.
- **Dọn các lịch đã chạy**: đưa các link đã đến giờ vào hẳn danh sách voucher, rồi bấm Lưu.

Lưu ý: kho lưu và lịch nằm trong `vouchers-data.js`, là file công khai, nên người biết xem mã nguồn vẫn thấy các link và mã đang cất.

### Lưu voucher, hỏi đáp, nhắc lịch, cài web

- **♡ Lưu / tab "Đã lưu"**: người xem lưu voucher ưa thích ngay trên máy của họ (không gửi đi đâu).
- **Câu hỏi thường gặp**: sửa nội dung trong `index.html` (mục `id="faq"`). Nếu sửa, hãy sửa cả khối dữ liệu `application/ld+json` ở đầu file để Google hiểu đúng.
- **Thêm nhắc giờ vào lịch**: tải file `.ics` gồm 6 lịch lặp hằng ngày (0h, 9h, 12h, 15h, 18h, 21h giờ Việt Nam), nhắc trước 5 phút.
- **Cài web lên màn hình chính** (PWA): có nút "Cài web" trên trình duyệt hỗ trợ; trên iPhone có dòng hướng dẫn ở chân trang. Cần chạy qua `https` (GitHub Pages). Web luôn ưu tiên bản mới nhất, chỉ dùng bản lưu khi mất mạng.
- **Ảnh xem trước khi chia sẻ link (Zalo, Facebook)**: mở `index.html`, thay `TEN-BAN` và `TEN-KHO` trong hai dòng `og:image` và `twitter:image` bằng tên tài khoản và tên kho GitHub của bạn. Ví dụ `https://nguyenvan.github.io/voucher/images/og.png`. Không thay thì ảnh xem trước sẽ không hiện. Ảnh nằm ở `images/og.png` (1200x630), bạn có thể thay bằng ảnh của mình.

### Admin: nhân bản và kéo thả

Mỗi voucher có nút **Nhân bản** (tạo bản sao ngay bên dưới) và biểu tượng ⠿ để kéo thả đổi thứ tự trên máy tính. Trên điện thoại hãy dùng nút ↑ ↓.
