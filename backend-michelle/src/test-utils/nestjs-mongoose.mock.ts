// @nestjs/mongoose v12 se publica solo como ESM y Jest (CommonJS) no puede cargarlo.
// Los tests unitarios inyectan modelos falsos, así que basta con decoradores vacíos.
const noopDecorator = () => () => undefined;

export const InjectModel = noopDecorator;
export const Prop = noopDecorator;
export const Schema = noopDecorator;
export const SchemaFactory = {
  createForClass: () => ({ index: () => undefined }),
};
