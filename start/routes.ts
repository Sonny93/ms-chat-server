/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from "@ioc:Adonis/Core/Route";

Route.get("/", async () => ({ hello: "world" }));
Route.get("/routerRtpCapabilities", "RtpCapabilitiesController.index");

Route.get("/rooms", "RoomsController.index");
Route.post("/rooms", "RoomsController.create");

Route.get("/rooms/:roomId", "RoomsController.get");
Route.delete("/rooms/:roomId", "RoomsController.delete");
// patch : only send new params
Route.patch("/rooms/:roomId", "RoomsController.update");

Route.post("/rooms/:roomId/user", "RoomsController.join");
Route.delete("/rooms/:roomId/user", "RoomsController.leave");

Route.get("/rooms/:roomId/messages", "RoomsController.messages");
Route.post("/rooms/:roomId/messages", "RoomsController.createMessage");
