import { prisma } from "../../../db/prisma.js";
import { HttpError } from "../../../lib/http-error.js";

export async function getCategories() {
    return prisma.category.findMany({ orderBy: { id: 'asc' } });
}

export async function createCategory(name: string) {
    return prisma.category.create({ data: { name } });
}

export async function updateCategory(id: number, name: string) {
    return prisma.category.update({ where: { id }, data: { name } });
}

export async function deleteCategory(id: number) {
    const used = await prisma.service.count({ where: { categoryId: id } });
    if (used > 0) {
        throw new HttpError(409, 'Category still has services');
    }
    return prisma.category.delete({ where: { id } });
}
