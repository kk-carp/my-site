import { getCollection } from 'astro:content';

export async function publishedPosts() {
  return (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export async function publishedProjects() {
  return (await getCollection('projects', ({ data }) => !data.draft))
    .sort((a, b) => a.data.order - b.data.order);
}

export const formatDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '.');
