#!/usr/bin/env node
// 토스 검수 컴플라이언스 정적 스캔. 의존성 0(순수 node ESM).
//
//   node scripts/check-compliance.mjs [대상디렉터리]   (기본: src)
//
// 검수 반려로 직결되는 것만 본다: 다크모드를 깨는 하드코딩 색상, 외부 도메인
// 이탈, 앱 설치 유도 문구, Android 7/iOS 16에서 없는 API, 그리고 TDS 대신
// 외부 UI 라이브러리나 외부 로그인·결제·광고 SDK를 끌어오는 import.
//
// 다른 게이트 스크립트와 달리 `// gate-allow:` 예외 주석을 인정하지 않는다 —
// 여기 걸리는 항목은 "우리 판단으로 넘어갈 수 있는 것"이 아니라 심사에서
// 그대로 반려되는 항목이라, 예외를 허용하면 게이트의 의미가 없다.

import fs from "node:fs";
import path from "node:path";

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const STYLE_EXT = new Set([".css"]);
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  "__tests__",
  "__shots__",
  "__snapshots__",
]);
const SKIP_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

// TDS 대신 쓰면 즉시 반려되는 UI 라이브러리
const FORBIDDEN_UI_PACKAGES = [
  "@mui",
  "@material-ui",
  "@ant-design",
  "antd",
  "@chakra-ui",
  "@radix-ui",
  "@mantine",
  "react-bootstrap",
  "bootstrap",
  "shadcn-ui",
  "@shadcn",
];

// 외부 로그인 · 결제 · 광고 · 분석 SDK (앱인토스 SDK로만 처리해야 함)
const FORBIDDEN_SDK_PACKAGES = [
  "firebase",
  "@firebase",
  "stripe",
  "@stripe",
  "@tosspayments",
  "@portone",
  "iamport-react-native",
  "@sentry",
  "amplitude-js",
  "@amplitude",
  "mixpanel-browser",
  "react-ga",
  "react-ga4",
  "@react-oauth",
  "react-google-login",
  "react-kakao-login",
  "react-naver-login",
  "@react-native-google-signin",
  "google-ads-api",
  "react-adsense",
];

/**
 * 규칙을 **설명하는 주석**이 규칙 위반으로 잡히는 것을 막는다.
 * (예: shareCard.ts의 "외부 링크·앱 설치 유도 문구를 포함하지 않는다")
 */
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--");
}

/** `var(--tds-color-blue500, #3182F6)`의 hex는 CSS 변수 폴백이라 정석 사용법이다. */
function stripVarFallbacks(line) {
  return line.replace(/var\(\s*--[\w-]+\s*,[^)]*\)/g, "var(--x)");
}

function importSpecifiers(line) {
  const found = [];
  const re = /\bfrom\s*["']([^"']+)["']|\bimport\s*\(?\s*["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(line)) != null) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec) found.push(spec);
  }
  return found;
}

function matchesPackage(spec, pkg) {
  return spec === pkg || spec.startsWith(`${pkg}/`);
}

const isCode = (file) => CODE_EXT.has(path.extname(file));
const isStyle = (file) => STYLE_EXT.has(path.extname(file));

const RULES = [
  {
    id: "hardcoded-color",
    label: "하드코딩 색상 리터럴 — var(--adaptive*) / var(--tds-color-*) 사용 (다크모드 깨짐)",
    applies: (file) => isCode(file) || isStyle(file),
    test: (line) => /#[0-9a-fA-F]{3,8}\b/.test(stripVarFallbacks(line)),
  },
  {
    id: "outlink",
    label: "외부 도메인 이탈 — 미니앱은 앱 안에서 흐름이 끝나야 한다",
    applies: isCode,
    test: (line) =>
      /window\.open\s*\(|location\.href\s*=|location\.(assign|replace)\s*\(|target\s*=\s*["']_blank["']/.test(
        line,
      ),
  },
  {
    id: "install-copy",
    label: "앱 설치 유도 문구 — 검수 반려 사유",
    applies: (file) => isCode(file) || isStyle(file),
    test: (line) => /설치|다운로드/.test(line),
  },
  {
    id: "unsupported-api",
    label: "Android 7 / iOS 16에 없는 API — 구버전 단말에서 흰 화면",
    applies: (file) => isCode(file) || isStyle(file),
    test: (line) =>
      /\.findLast(Index)?\s*\(|\bObject\.groupBy\b|\bMap\.groupBy\b|\bstructuredClone\s*\(|\bIntl\.Segmenter\b|\.toSorted\s*\(|\.toReversed\s*\(|\.toSpliced\s*\(|:has\(/.test(
        line,
      ),
  },
  {
    id: "forbidden-ui-import",
    label: "외부 UI 라이브러리 import — UI는 TDS(@toss/tds-mobile)만",
    applies: isCode,
    test: (line) =>
      importSpecifiers(line).some(
        (spec) =>
          FORBIDDEN_UI_PACKAGES.some((pkg) => matchesPackage(spec, pkg)) ||
          /(^|\/)components\/ui\//.test(spec) ||
          /shadcn/i.test(spec),
      ),
  },
  {
    id: "forbidden-sdk-import",
    label: "외부 로그인·결제·광고·분석 SDK import — @apps-in-toss/web-framework만 사용",
    applies: isCode,
    test: (line) =>
      importSpecifiers(line).some((spec) =>
        FORBIDDEN_SDK_PACKAGES.some((pkg) => matchesPackage(spec, pkg)),
      ),
  },
];

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("__tmp")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(full, out);
    } else if ((isCode(entry.name) || isStyle(entry.name)) && !SKIP_FILE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function scanFile(file) {
  const violations = [];
  const lines = fs.readFileSync(file, "utf-8").split("\n");
  const rules = RULES.filter((rule) => rule.applies(file));

  lines.forEach((line, i) => {
    if (isCommentLine(line)) return;
    for (const rule of rules) {
      if (rule.test(line)) {
        violations.push({ file, line: i + 1, rule, text: line.trim().slice(0, 120) });
      }
    }
  });

  return violations;
}

const target = path.resolve(process.argv[2] ?? "src");

if (!fs.existsSync(target)) {
  console.error(`검사할 경로가 없어요: ${target}`);
  process.exit(1);
}

const files = collectFiles(target);
const violations = files.flatMap(scanFile);

if (violations.length === 0) {
  console.log(`✅ 컴플라이언스 위반 0건 — 검사 파일 ${files.length}개`);
  process.exit(0);
}

console.error(`❌ 컴플라이언스 위반 ${violations.length}건 — 검사 파일 ${files.length}개\n`);
for (const v of violations) {
  console.error(`  ${path.relative(process.cwd(), v.file)}:${v.line}  [${v.rule.id}] ${v.rule.label}`);
  console.error(`    ${v.text}\n`);
}
process.exit(1);
