export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  pages: number;
}
