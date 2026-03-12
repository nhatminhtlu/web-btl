# ──────────────────────────────────────────────────────────────────────
# Dockerfile — AI Brand Name & Slogan Generator
#
# Uses a single-stage build: copies the static files into an official
# Nginx image that serves them on port 80.
#
# Build:   docker build -t ai-brand-generator .
# Run:     docker run -p 8080:80 ai-brand-generator
# Browse:  http://localhost:8080
# ──────────────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy static site files into the Nginx web root
COPY index.html  /usr/share/nginx/html/
COPY style.css   /usr/share/nginx/html/
COPY script.js   /usr/share/nginx/html/

# (Optional) copy any assets directory if it exists
# COPY assets/ /usr/share/nginx/html/assets/

# Replace the default config with a minimal, security-hardened one
RUN printf 'server {\n\
    listen       80;\n\
    server_name  localhost;\n\
\n\
    root   /usr/share/nginx/html;\n\
    index  index.html;\n\
\n\
    # Serve index.html for all routes (SPA-friendly)\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Security headers\n\
    add_header X-Frame-Options        "SAMEORIGIN"   always;\n\
    add_header X-Content-Type-Options "nosniff"      always;\n\
    add_header Referrer-Policy        "strict-origin" always;\n\
\n\
    # Cache static assets for 1 day\n\
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1d;\n\
        add_header Cache-Control "public, max-age=86400";\n\
    }\n\
\n\
    # Gzip compression\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
