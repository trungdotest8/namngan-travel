# Hướng dẫn thêm Integration mới

Để tích hợp một service ngoài mới (ví dụ: Zalo OA, VNPAY, GHN):

1. Tạo file `src/lib/integrations/<tên-service>.ts`
2. Export hàm wrapper với error handling đầy đủ
3. Tạo API route tại `src/app/api/webhooks/<tên-service>/route.ts`
4. Implement `WebhookHandler` interface từ `@/types`
5. Verify request bằng `WEBHOOK_SECRET` trước khi xử lý
6. Thêm biến môi trường vào `.env.example`
