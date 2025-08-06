import { $ } from 'execa'
export async function checkpoint(msg = 'checkpoint') {
  await $`git add -A`
  try {
    await $`git commit -m ${msg} -q`
  } catch {}
  try {
    await $`git push -u origin main -q`
  } catch {}
}
