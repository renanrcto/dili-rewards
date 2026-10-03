/** Primeiro nome, usado na saudação dos e-mails. */
export function firstName(name: string): string {
  return name.split(' ')[0] || name;
}
