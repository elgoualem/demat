import { NextFunction, Request, Response } from "express";

// Sans ça, une exception dans un handler async n'est jamais catchée par Express :
// la promesse rejette dans le vide et Node tue tout le process (crash du serveur entier).
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Req, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
