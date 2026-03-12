FROM debian:bullseye-slim as builder

# Create credentials directory
RUN mkdir -p /root/.config/gcloud

# Copy service account key - this file should be placed in the same directory as Dockerfile
COPY docker/bqsync/application_default_credentials.json /root/.config/gcloud/application_default_credentials.json

FROM debian:bullseye-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    apt-transport-https \
    ca-certificates \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Add MongoDB repository and install MongoDB tools
RUN wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add - \
    && echo "deb http://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list \
    && apt-get update \
    && apt-get install -y mongodb-database-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list \
    && wget -q -O- https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - \
    && apt-get update \
    && apt-get install -y google-cloud-sdk \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /app /root/data /root/.config/gcloud

# Copy credentials from builder stage
COPY --from=builder /root/.config/gcloud/application_default_credentials.json /root/.config/gcloud/application_default_credentials.json

# Copy only the required files
COPY packages/exporter/bqsync /app/
COPY docker/bqsync/init.sh /app/

# Create crontab file
RUN echo "0 * * * * /app/bqsync >> /var/log/cron.log 2>&1" > /etc/cron.d/bqsync-cron && \
    chmod 0644 /etc/cron.d/bqsync-cron && \
    crontab /etc/cron.d/bqsync-cron

# Create the log file
RUN touch /var/log/cron.log

# Set working directory
WORKDIR /app

# Make scripts executable
RUN chmod +x /app/bqsync /app/init.sh

# Set environment variable for Google credentials
ENV GOOGLE_APPLICATION_CREDENTIALS=/root/.config/gcloud/application_default_credentials.json

# Set entrypoint to initialization script
ENTRYPOINT ["/app/init.sh"]
