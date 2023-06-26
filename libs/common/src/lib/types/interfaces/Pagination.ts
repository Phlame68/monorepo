export type TPaginationParams = Partial<{
    page: number;
    limit: number;
    total: number;
    previous?: { page: number };
    next?: { page: number };
}>;
