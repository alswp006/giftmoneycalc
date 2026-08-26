/**
 * jest-dom 매처(toBeInTheDocument 등)의 타입을 vitest Assertion에 붙인다.
 *
 * 런타임 등록은 vitest.setup.ts의 `import "@testing-library/jest-dom/vitest"`가
 * 하지만, tsconfig의 include가 "src"뿐이라 tsc는 그 파일을 보지 못해 테스트에서
 * `Property 'toBeInTheDocument' does not exist` 에러가 났다. src 안에서 같은
 * 모듈을 참조해 타입 보강만 끌어온다.
 */
import "@testing-library/jest-dom/vitest";
