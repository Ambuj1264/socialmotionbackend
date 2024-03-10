import "reflect-metadata";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import bodyParser from "body-parser";
import cors from "cors";
import express,{Request,Response} from "express";
import { expressMiddleware } from "@apollo/server/express4";
import http from "http";
import path from "path";
import { resolvers } from "./src/graphql";
import { typeDefs } from "./src/graphql/schema/typedefs";
import yenv from "yenv";
import fileUpload from "express-fileupload";
require("./src/config/connection");
import route from "./src/RestApi/restRoute";

import { authMiddleware } from "./src/graphql/schema";
const startServer = async () => {
  yenv("env.yaml", { env: "development" });
  const router = express();

  router.use(
    cors({
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  const publicPath = path.join(__dirname, "public");
  router.use(express.static(publicPath));
  router.use(express.json());
  router.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
  router.get('/', (_req: Request, res: Response) => {
    return res.send('Express Typescript on Vercel')
  })
  router.use(
    fileUpload({
      useTempFiles: true,
    })
  );
  router.use(route);
  router.use((req, res, next) => {
    next();
  });
  const httpServer = http.createServer(router);

  const server: any = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  router.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json({ limit: "50mb" }),

    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const { loginId, userId } = await authMiddleware(req);
        return {
          loginId,
          userId,
        };
      },
    })
    // expressMiddleware(server, {})
  );

  await new Promise<void>((resolve) =>
    httpServer.listen(
      {
        port: 5001,
      },
      resolve
    )
  );
  // tslint:disable-next-line
  console.log("🚀 Server ready at http://localhost:5001/graphql");
};
startServer();