export interface IPaginatedResultProducts<T> {
  items: T[];
  total: number;
  pages: number;
}
