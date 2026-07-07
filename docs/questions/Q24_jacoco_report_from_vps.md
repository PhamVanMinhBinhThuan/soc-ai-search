# Q24 - Lấy JaCoCo report từ VPS về máy local

## Mục đích

JaCoCo report là báo cáo độ phủ test của backend Java. Trên VPS, cần chạy test để sinh report, sau đó copy thư mục report về máy local để mở bằng trình duyệt.

## 1. Chạy test trên VPS

SSH vào VPS:

```bash
ssh root@178.128.111.251
```

Vào thư mục backend:

```bash
cd ~/soc-ai-search/backend
```

Nếu VPS chưa có Java hoặc chưa set `JAVA_HOME`:

```bash
apt update
apt install -y openjdk-21-jdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

Chạy backend test để sinh JaCoCo report:

```bash
chmod +x ./mvnw
./mvnw test
```

Report được sinh tại:

```bash
~/soc-ai-search/backend/target/site/jacoco/index.html
```

## 2. Copy report từ VPS về máy Windows

Thoát khỏi VPS:

```bash
exit
```

Trên PowerShell máy Windows, chạy:

```powershell
scp -r root@178.128.111.251:~/soc-ai-search/backend/target/site/jacoco .\jacoco-report
```

## 3. Mở report

```powershell
Start-Process .\jacoco-report\index.html
```

## Câu trả lời ngắn khi bảo vệ

Em chạy `./mvnw test` trên VPS để Maven sinh JaCoCo report trong `target/site/jacoco`, sau đó dùng `scp` copy thư mục này về máy local và mở file `index.html` bằng trình duyệt.
