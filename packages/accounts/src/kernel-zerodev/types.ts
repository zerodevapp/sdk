export type WithOptional<T, K extends keyof T> = Pick<Partial<T>, K>;
export type WithRequired<T, K extends keyof T> = Required<Pick<T, K>>;
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
