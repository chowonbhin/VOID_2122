# 컬러 시스템 가이드 — 로즈 테라코타 × 미색 노트

> 이 문서는 UI를 구현하는 에이전트를 위한 색상 명세다.
> 모든 색은 아래 정의된 토큰으로만 사용하고, 임의의 hex 값이나 기본 회색(gray, slate, zinc 등)을 새로 만들지 않는다.

## 1. 디자인 의도

- 키워드: **향수, 익숙함, 소중함**
- 콘셉트: 손때 묻은 공책 위에 장밋빛 잉크로 적은 기억
- 바탕과 선, 글씨는 모두 "종이와 잉크" 톤으로 통일하고, 메인 색(로즈 테라코타)은 소중한 순간에만 아껴 쓴다.

## 2. 팔레트

### 2.1 메인 — Rose Terracotta (`rose`)

| 토큰 | Hex | 용도 |
|---|---|---|
| `rose-50` | `#FBEFEC` | 선택 상태 배경, 태그 배경 |
| `rose-100` | `#F5D6CF` | hover 배경 (연한 영역) |
| `rose-200` | `#E9B0A5` | 장식, 일러스트 |
| `rose-300` | `#D9887A` | 장식, 차트 보조 |
| `rose-400` | `#C9705F` | 장식, 아이콘 (텍스트 사용 금지) |
| `rose-500` | `#B0524A` | **메인. 주요 버튼, 핵심 강조** |
| `rose-700` | `#8F3F38` | 버튼 pressed, 링크, 태그 텍스트 |
| `rose-900` | `#4A1F1C` | 연한 rose 배경 위 강한 텍스트 |

### 2.2 보조 — Peach (`peach`)

| 토큰 | Hex | 용도 |
|---|---|---|
| `peach-50` | `#FDF5EF` | 아주 옅은 강조 영역 |
| `peach-100` | `#F8E2D3` | 하이라이트 카드, 알림 배너 배경 |
| `peach-200` | `#EBB89A` | **보조 색. 장식, 진행 바, 일러스트** |
| `peach-300` | `#E0A07E` | 장식 |
| `peach-400` | `#D08A64` | 장식 |
| `peach-500` | `#B87150` | 아이콘 |
| `peach-700` | `#94573C` | peach 배경 위 텍스트 |
| `peach-900` | `#5A3524` | peach-100 배경 위 본문 텍스트 |

### 2.3 중립 — Paper & Ink (`paper`)

| 토큰 | Hex | 용도 |
|---|---|---|
| `paper-0` | `#FFFDF7` | 카드, 시트, 입력창 배경 |
| `paper-50` | `#FAF6EC` | **앱 기본 바탕** |
| `paper-100` | `#F2EBDC` | 눌린 영역, 비활성 배경, 리스트 hover |
| `paper-200` | `#E6DCC8` | 구분선, 카드 테두리 |
| `paper-300` | `#CFC2AA` | 강한 테두리, 보조 버튼 테두리, 입력창 테두리 |
| `paper-500` | `#9A8A78` | placeholder, 비활성 아이콘 (본문 텍스트 사용 금지) |
| `paper-700` | `#6E5D50` | 보조 텍스트, 캡션, 기본 아이콘 |
| `paper-900` | `#3B2A22` | **본문 텍스트 (잉크색)** |

### 2.4 의미 색 (Semantic)

| 역할 | Solid | 배경 (tint) | 텍스트 (tint 위) | 비고 |
|---|---|---|---|---|
| success | `#567553` | `#E8EDDC` | `#2F4A2D` | solid 위 흰 글씨 가능 |
| warning | `#B07D22` | `#F7EACB` | `#6E4A12` | **solid 위 흰 글씨 금지**, 짙은 텍스트 사용 |
| error | `#9A1F32` | `#F7DDDD` | `#6E1524` | 메인과 같은 붉은 계열이므로 반드시 아이콘 + 문구 병행 |
| info | `#4F6A7A` | `#E3E8E8` | `#2C4250` | solid 위 흰 글씨 가능 |

## 3. 다크 모드

종이 느낌을 유지하기 위해 순검정이 아닌 **따뜻한 짙은 갈색** 바탕을 쓴다.

| 역할 | Light | Dark |
|---|---|---|
| 앱 바탕 | `#FAF6EC` | `#221C17` |
| 카드 | `#FFFDF7` | `#2C2520` |
| 눌린 영역 | `#F2EBDC` | `#352C25` |
| 구분선 | `#E6DCC8` | `#43382F` |
| 강한 테두리 | `#CFC2AA` | `#5A4A3E` |
| 본문 텍스트 | `#3B2A22` | `#F2EADC` |
| 보조 텍스트 | `#6E5D50` | `#C2B5A3` |
| placeholder | `#9A8A78` | `#8A7C6C` |
| 주요 버튼 배경 | `#B0524A` | `#E08A7B` |
| 주요 버튼 텍스트 | `#FFFFFF` | `#2A1513` |
| 링크 / 태그 텍스트 | `#8F3F38` | `#EBA597` |
| 태그·선택 배경 | `#FBEFEC` | `#3D2724` |
| 하이라이트 배경 | `#F8E2D3` | `#3A2C22` |
| 하이라이트 텍스트 | `#5A3524` | `#F3CDB4` |
| success | `#567553` | `#8FB08B` |
| warning | `#B07D22` | `#E0B05A` |
| error | `#9A1F32` | `#E8828F` |
| info | `#4F6A7A` | `#8FAABB` |

## 4. CSS 변수

컴포넌트는 hex가 아니라 아래 **역할 변수**만 참조한다.

```css
:root {
  /* surface */
  --color-bg: #FAF6EC;
  --color-surface: #FFFDF7;
  --color-surface-sunken: #F2EBDC;
  --color-border: #E6DCC8;
  --color-border-strong: #CFC2AA;

  /* text */
  --color-text: #3B2A22;
  --color-text-secondary: #6E5D50;
  --color-text-placeholder: #9A8A78;

  /* brand */
  --color-primary: #B0524A;
  --color-primary-pressed: #8F3F38;
  --color-on-primary: #FFFFFF;
  --color-link: #8F3F38;
  --color-primary-subtle: #FBEFEC;
  --color-highlight: #F8E2D3;
  --color-on-highlight: #5A3524;
  --color-accent: #EBB89A;

  /* semantic */
  --color-success: #567553;
  --color-success-bg: #E8EDDC;
  --color-success-text: #2F4A2D;
  --color-warning: #B07D22;
  --color-warning-bg: #F7EACB;
  --color-warning-text: #6E4A12;
  --color-error: #9A1F32;
  --color-error-bg: #F7DDDD;
  --color-error-text: #6E1524;
  --color-info: #4F6A7A;
  --color-info-bg: #E3E8E8;
  --color-info-text: #2C4250;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #221C17;
    --color-surface: #2C2520;
    --color-surface-sunken: #352C25;
    --color-border: #43382F;
    --color-border-strong: #5A4A3E;

    --color-text: #F2EADC;
    --color-text-secondary: #C2B5A3;
    --color-text-placeholder: #8A7C6C;

    --color-primary: #E08A7B;
    --color-primary-pressed: #EBA597;
    --color-on-primary: #2A1513;
    --color-link: #EBA597;
    --color-primary-subtle: #3D2724;
    --color-highlight: #3A2C22;
    --color-on-highlight: #F3CDB4;
    --color-accent: #EBB89A;

    --color-success: #8FB08B;
    --color-warning: #E0B05A;
    --color-error: #E8828F;
    --color-info: #8FAABB;
  }
}
```

## 5. Tailwind 설정 (Tailwind 사용 시)

```js
// tailwind.config.js
module.exports = {
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#FBEFEC', 100: '#F5D6CF', 200: '#E9B0A5', 300: '#D9887A',
          400: '#C9705F', 500: '#B0524A', 700: '#8F3F38', 900: '#4A1F1C',
        },
        peach: {
          50: '#FDF5EF', 100: '#F8E2D3', 200: '#EBB89A', 300: '#E0A07E',
          400: '#D08A64', 500: '#B87150', 700: '#94573C', 900: '#5A3524',
        },
        paper: {
          0: '#FFFDF7', 50: '#FAF6EC', 100: '#F2EBDC', 200: '#E6DCC8',
          300: '#CFC2AA', 500: '#9A8A78', 700: '#6E5D50', 900: '#3B2A22',
        },
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        // 나머지 역할 변수도 같은 방식으로 매핑
      },
    },
  },
};
```

> Tailwind 기본 `rose` 팔레트를 덮어쓴다. 기본 `gray`, `slate`, `zinc`, `neutral`, `stone` 클래스는 사용하지 않는다.

## 6. 컴포넌트 적용 규칙

| 컴포넌트 | 배경 | 텍스트 | 테두리 | 상태 |
|---|---|---|---|---|
| 주요 버튼 | `primary` | `on-primary` | 없음 | pressed: `primary-pressed`, 비활성: `surface-sunken` + `text-placeholder` |
| 보조 버튼 | 투명 | `link` | `border-strong` | pressed: `surface-sunken` |
| 텍스트 버튼 / 링크 | 투명 | `link` | 없음 | pressed 시 밑줄 |
| 카드 | `surface` | `text` | `border` (0.5~1px) | 선택 시 배경 `primary-subtle` |
| 태그 / 칩 | `primary-subtle` | `link` | 없음 | — |
| 하이라이트 배너 | `highlight` | `on-highlight` | 없음 | — |
| 입력창 | `surface` | `text` | `border-strong` | focus: 테두리 `primary` 2px, placeholder: `text-placeholder` |
| 구분선 | — | — | `border` | — |
| 알림 (성공 등) | `{semantic}-bg` | `{semantic}-text` | 없음 | 아이콘 필수 |
| 탭바 / 네비게이션 | `surface` | 비활성 `text-secondary`, 활성 `primary` | 상단 `border` | — |

## 7. 반드시 지킬 규칙

1. **메인 색은 아껴 쓴다.** 한 화면에 `primary` 배경 요소는 주요 버튼 1개가 원칙이다. 나머지 강조는 태그(`primary-subtle`)나 텍스트 색으로 처리한다.
2. **회색을 쓰지 않는다.** 구분선, 비활성, 보조 텍스트까지 모두 `paper` ramp에서 가져온다. 순수 회색(`#888`, `#E5E5E5` 등)이 하나라도 섞이면 종이 느낌이 깨진다.
3. **순백·순검정 금지.** 바탕은 `#FAF6EC`, 텍스트는 `#3B2A22`. `#FFFFFF`는 주요 버튼 위 글씨에만 허용한다.
4. **색만으로 의미를 전달하지 않는다.** 특히 error는 메인 색과 붉은 계열이 겹치므로 아이콘과 문구를 반드시 함께 표시한다.
5. **대비 기준(WCAG AA, 4.5:1)을 지킨다.**
   - `rose-400` 이하(더 밝은 단계), `peach` 전체, `paper-500`은 본문 텍스트로 쓰지 않는다.
   - warning solid(`#B07D22`) 위에는 흰 글씨를 올리지 않는다.
   - 다크 모드 주요 버튼 글씨는 흰색이 아니라 `#2A1513`이다.
6. **그라데이션, 강한 그림자를 쓰지 않는다.** 깊이는 `bg` → `surface` 밝기 차이와 얇은 `border`로 표현한다. 그림자가 필요하면 `rgba(59, 42, 34, 0.08)` 정도의 잉크색 기반 옅은 그림자만 쓴다.

## 8. (선택) 종이 질감

색만으로 부족할 때 앱 바탕에 아주 옅은 노이즈를 얹는다. 눈에 띄면 안 되며, "있는지 모를 정도"가 기준이다.

```css
body {
  background-color: var(--color-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}
```

- 카드(`surface`)에는 질감을 넣지 않는다. 바탕에만 적용해 "종이 위에 놓인 종이" 대비를 만든다.
- 다크 모드에서는 opacity를 0.03 이하로 낮추거나 제거한다.

## 9. 프로젝트 적용 메모 (2026-11-08)

- 화면 색상은 `src/colors.css`의 역할 변수로 관리한다. 지도는 기존 친밀도(Lv) 의미를 유지하며 paper → rose 색상 단계로 구분한다.
- 메뉴·지도 핀·추억·카메라·닫기·상태 표시는 `src/components/Icon.tsx`의 24px / 1.6px 둥근 선형 아이콘을 공통 사용한다.
- 기존 실제 간판 사진과 나침반 앱 아이콘 형태를 유지한다. PNG 앱 아이콘은 `node scripts/export-app-icons.mjs`로 같은 SVG와 컬러 토큰에서 다시 만든다.
- 참고: [Papier 노트 컬렉션](https://www.papier.com/stationery/notebooks/)의 미색 바탕·사진과 캡션 구분, [DÔEN](https://www.shopdoen.com/)의 절제된 여백·사진 중심 구성. 색상 수치는 본 문서를 우선하며 외부 사진·로고·폰트는 가져오지 않았다.
- 그라데이션·배경 점무늬·반복적인 사진 기울임을 제거한다. 실제 사진, 얇은 종이색 선, 필요한 선택 표시로 화면의 밀도를 조절한다.
