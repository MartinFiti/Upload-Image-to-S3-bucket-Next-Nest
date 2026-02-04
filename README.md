# Upload-Image-to-S3-bucket-Next-Nest

The project is organized as a monorepo containing a **frontend** built with Next.js and a **backend** built with NestJS.

## Folder Structure

```mermaid
graph TD;
  A[Root Directory] --> B[frontend];
  A --> C[backend];
  A --> D[Docker compose]
  B --> B1[NextApp];
  B --> B2[Dockerfile];
  C --> C1[Nest.js App];
  C --> C2[DockerFile App];
  C --> C3[DB Config];
```

### Frontend

The **frontend** is a standard Next.js application with the following main folders:

- **`app/`**: Contains the application routes and components, leveraging the new App Directory feature in Next.js.
- **`public/`**: Stores static assets like images, icons, and other resources.
- **`components/`**: Reusable React components that are used across various parts of the application.

### Backend

The **backend** is a standard NestJS application with the following main folders under `src/`:

- **`features/`**: Contains individual feature modules, each module encapsulates its related controllers, services, and entities.
- **`services/`**: Houses shared services that can be used across multiple features.
- **`controllers/`**: Contains the main controllers for handling HTTP requests.
- **`entities/`**: Represents the data models used in TypeORM for interacting with the database.

## Installation

This project uses Docker to simplify the setup process. Follow the steps below to get started:

1. **Clone the repository**:

   ```bash
   git clone <RepoName>
   cd <RepoName>
   ```

2. **Create the necessary `.env` files** for the frontend and backend. Refer to `.env.example` files provided in each folder. You will only need to add variables for AWS.

3. **Build and start the Docker containers**:

   This has to do to a problem with my Dockerfile in the frontend. I could not solve it so the workarround is to build locally and then run docker compose.

   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

   ```bash
   docker-compose up --build
   ```

4. **Access the applications**:

   - The **frontend** will be available at [http://localhost:3001](http://localhost:3001).
   - The **backend** will be available at [http://localhost:9000](http://localhost:9000).
   - The **database** will be available at [http://localhost:3012](http://localhost:3012).

5. **Verify the Setup**:

   Go to to the forontend [localhost:3001](http://localhost:3001) and check if the app is up.

## S3 Storage

By default, the project uses **LocalStack** to emulate AWS S3 locally—no AWS account needed.

### LocalStack (Default)

- Data persists in the `./volume/` folder across container restarts
- To reset S3 data: `rm -rf ./volume && docker compose up`

### Switching to Real AWS S3

1. Update your `.env` file:

   ```env
   S3_ENDPOINT=
   S3_PUBLIC_ENDPOINT=
   AWS_ACCESS_KEY=your-access-key
   AWS_SECRET_KEY=your-secret-key
   AWS_BUCKET_REGION=us-east-1
   AWS_BUCKET_NAME=your-bucket-name
   ```

2. Comment out the `localstack` service in `docker-compose.yml`

3. Ensure your S3 bucket has CORS configured for browser uploads

## Additional Notes

- Make sure Docker is installed and running on your system before starting the setup.
- If any issues arise, check the container logs using:

  ```bash
  docker-compose logs
  ```
