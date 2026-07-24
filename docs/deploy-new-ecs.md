# 新阿里云 ECS 部署说明

本项目以后只部署到新服务器：`47.112.10.126`。不要再部署到旧服务器 `112.124.63.206`。

## 当前服务器约定

- 服务器系统：Ubuntu 26.04
- 项目目录：`/opt/digital-commerce-practicum`
- PM2 进程名：`digital-commerce-practicum`
- 当前访问地址：`http://47.112.10.126:3000/practicum`
- 服务器构建命令：

```bash
cd /opt/digital-commerce-practicum
npm install
npm run build
pm2 restart digital-commerce-practicum
pm2 save
```

## 本地一键部署（推荐）

在 Windows 本地执行，目录是：

```powershell
cd C:\Users\29053\Desktop\智能体\数字商贸实训工作台
```

如果 SSH 用户是 `root`，执行：

```powershell
npm run deploy:new-ecs
```

如果 SSH 用户不是 `root`，例如 `ubuntu`，执行：

```powershell
python .\scripts\deploy-new-ecs.py --user ubuntu
```

脚本会安全地提示输入 SSH 密码，不会把密码保存到项目文件里。

部署前只检查本地和服务器是否一致：

```powershell
python .\scripts\deploy-new-ecs.py --check-only
```

这个脚本会做这些事：

1. 对比本地和服务器源码，排除 `node_modules`、`.nuxt`、`.output` 等生成目录。
2. 打包项目源码，不上传 `node_modules`、`.nuxt`、`.output`、测试截图等临时目录。
3. 上传到 `47.112.10.126:/tmp/`。
4. 安全清空并解压到 `/opt/digital-commerce-practicum`。
5. 在服务器执行 `npm install`、`npm run build`、`pm2 restart digital-commerce-practicum`、`pm2 save`。
6. 检查 `http://127.0.0.1:3000/practicum` 是否返回 HTTP 200。
7. 部署后可再次执行 `--check-only`，确认本地与服务器源码一致。

## 第一次部署前的服务器检查

在服务器执行：

```bash
cd /opt/digital-commerce-practicum
ls -la
test -f package.json && echo package.json OK
test -f nuxt.config.ts && echo nuxt.config.ts OK
test -f tsconfig.json && echo tsconfig.json OK
pm2 status digital-commerce-practicum
```

如果缺少 `package.json`、`nuxt.config.ts` 或 `tsconfig.json`，直接运行本地一键部署脚本即可补齐。

## 确认本地和服务器文件是否一致

本地执行：

```powershell
cd C:\Users\29053\Desktop\智能体\数字商贸实训工作台
python .\scripts\deploy-new-ecs.py --check-only
```

如果输出里这三项都是 `0`，就说明本地和服务器源码一致：

- `missing_on_remote_count`
- `extra_on_remote_count`
- `different_count`

## 可选：配置 Nginx 反向代理

目标是让用户访问：`http://47.112.10.126/practicum`，不用带 `:3000`。

当前服务器已安装并配置 Nginx。服务器本机验证：

```bash
curl -I -H 'Host: 47.112.10.126' http://127.0.0.1/practicum
```

返回 `HTTP/1.1 200 OK`。如果公网访问 `http://47.112.10.126/practicum` 超时，请到阿里云 ECS 安全组放行入方向 `TCP 80`。

在服务器执行：

```bash
sudo apt update
sudo apt install -y nginx
```

创建配置：

```bash
sudo nano /etc/nginx/sites-available/digital-commerce-practicum
```

填入：

```nginx
server {
    listen 80;
    server_name 47.112.10.126;

    location /practicum {
        proxy_pass http://127.0.0.1:3000/practicum;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_nuxt/ {
        proxy_pass http://127.0.0.1:3000/_nuxt/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

启用并检查：

```bash
sudo ln -sf /etc/nginx/sites-available/digital-commerce-practicum /etc/nginx/sites-enabled/digital-commerce-practicum
sudo nginx -t
sudo systemctl reload nginx
curl -I http://47.112.10.126/practicum
```

注意：服务器上还有 Directus 和 llm-wiki，配置 Nginx 时不要改动它们正在使用的端口和服务。
