export function classifyStorefront(status: number, finalUrl: string) {
  const url = new URL(finalUrl);
  const passwordPage = url.pathname === "/password" || url.pathname.startsWith("/password/");
  const ok = status >= 200 && status < 300;
  return { status: ok && !passwordPage ? "available" : "attention", message: passwordPage ? "首页跳转到了密码保护页面" : ok ? "首页请求成功" : `首页返回 HTTP ${status}` };
}
