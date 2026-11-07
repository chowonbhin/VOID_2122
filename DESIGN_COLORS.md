# 컬러 시스템 가이드 — 로즈 테라코타 × 뉴트럴 화이트

> 이 문서는 UI를 구현하는 에이전트를 위한 색상 명세다.
> 모든 색은 아래 정의된 토큰으로만 사용하고, 임의의 hex 값이나 기본 회색(gray, slate, zinc 등)을 새로 만들지 않는다.

> **최신 사용자 결정 (2026-11-08): 크림색은 제외한다.** 바탕은 뉴트럴 화이트·밝은 회색, 본문은 차콜로 정리한다. 로즈 테라코타 강조는 유지한다. 아래 중립 팔레트와 규칙은 이 결정을 반영한 현재 기준이다.

## 1. 디자인 의도

- 키워드: **향수, 익숙함, 소중함**
- 콘셉트: 실제 장소 사진과 개인의 기록이 중심이 되는 정돈된 수첩
- 크림·베이지 바탕을 쓰지 않고 흰 카드·중립 구분선·차콜 글씨로 통일하고, 메인 색(로즈 테라코타)은 소중한 순간에만 아껴 쓴다.

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
| `peach-100` | `#F8E2D3` | 작은 일러스트 전용 (넓은 카드/바탕에는 사용하지 않음) |
| `peach-200` | `#EBB89A` | **보조 색. 장식, 진행 바, 일러스트** |
| `peach-300` | `#E0A07E` | 장식 |
| `peach-400` | `#D08A64` | 장식 |
| `peach-500` | `#B87150` | 아이콘 |
| `peach-700` | `#94573C` | peach 배경 위 텍스트 |
| `peach-900` | `#5A3524` | peach-100 배경 위 본문 텍스트 |

### 2.3 중립 — Neutral White & Ink (`paper`, 기존 토큰명 유지)

| 토큰 | Hex | 용도 |
|---|---|---|
| `paper-0` | `#FFFFFF` | 카드, 시트, 입력창 배경 |
| `paper-50` | `#F8F9FA` | **앱 기본 바탕** |
| `paper-100` | `#F0F1F3` | 눌린 영역, 비활성 배경, 리스트 hover |
| `paper-200` | `#E4E6E8` | 구분선, 카드 테두리 |
| `paper-300` | `#C8CDD2` | 강한 테두리, 보조 버튼 테두리, 입력창 테두리 |
| `paper-500` | `#858B94` | placeholder, 비활성 아이콘 (본문 텍스트 사용 금지) |
| `paper-700` | `#60656D` | 보조 텍스트, 캡션, 기본 아이콘 |
| `paper-900` | `#292B30` | **본문 텍스트 (차콜)** |

### 2.4 의미 색 (Semantic)

| 역할 | Solid | 배경 (tint) | 텍스트 (tint 위) | 비고 |
|---|---|---|---|---|
| success | `#567553` | `#E8EDDC` | `#2F4A2D` | solid 위 흰 글씨 가능 |
| warning | `#B07D22` | `#F7EACB` | `#6E4A12` | **solid 위 흰 글씨 금지**, 짙은 텍스트 사용 |
| error | `#9A1F32` | `#F7DDDD` | `#6E1524` | 메인과 같은 붉은 계열이므로 반드시 아이콘 + 문구 병행 |
| info | `#4F6A7A` | `#E3E8E8` | `#2C4250` | solid 위 흰 글씨 가능 |

## 3. 다크 모드

밝은 테마와 맞춰 **중립 차콜** 바탕을 쓴다.

| 역할 | Light | Dark |
|---|---|---|
| 앱 바탕 | `#F8F9FA` | `#1B1D20` |
| 카드 | `#FFFFFF` | `#24272B` |
| 눌린 영역 | `#F0F1F3` | `#2D3136` |
| 구분선 | `#E4E6E8` | `#393E45` |
| 강한 테두리 | `#C8CDD2` | `#555D68` |
| 본문 텍스트 | `#292B30` | `#F4F5F6` |
| 보조 텍스트 | `#60656D` | `#BFC4CC` |
| placeholder | `#858B94` | `#898F98` |
| 주요 버튼 배경 | `#B0524A` | `#E08A7B` |
| 주요 버튼 텍스트 | `#FFFFFF` | `#2A1513` |
| 링크 / 태그 텍스트 | `#8F3F38` | `#EBA597` |
| 태그·선택 배경 | `#FBEFEC` | `#3D2724` |
| 하이라이트 배경 | `#FBEFEC` | `#3D2724` |
| 하이라이트 텍스트 | `#8F3F38` | `#EBA597` |
| success | `#567553` | `#8FB08B` |
| warning | `#B07D22` | `#E0B05A` |
| error | `#9A1F32` | `#E8828F` |
| info | `#4F6A7A` | `#8FAABB` |

## 4. CSS 변수

컴포넌트는 hex가 아니라 아래 **역할 변수**만 참조한다.

```css
:root {
  /* surface */
  --color-bg: #F8F9FA;
  --color-surface: #FFFFFF;
  --color-surface-sunken: #F0F1F3;
  --color-border: #E4E6E8;
  --color-border-strong: #C8CDD2;

  /* text */
  --color-text: #292B30;
  --color-text-secondary: #60656D;
  --color-text-placeholder: #858B94;

  /* brand */
  --color-primary: #B0524A;
  --color-primary-pressed: #8F3F38;
  --color-on-primary: #FFFFFF;
  --color-link: #8F3F38;
  --color-primary-subtle: #FBEFEC;
  --color-highlight: var(--color-primary-subtle);
  --color-on-highlight: var(--color-link);
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
    --color-bg: #1B1D20;
    --color-surface: #24272B;
    --color-surface-sunken: #2D3136;
    --color-border: #393E45;
    --color-border-strong: #555D68;

    --color-text: #F4F5F6;
    --color-text-secondary: #BFC4CC;
    --color-text-placeholder: #898F98;

    --color-primary: #E08A7B;
    --color-primary-pressed: #EBA597;
    --color-on-primary: #2A1513;
    --color-link: #EBA597;
    --color-primary-subtle: #3D2724;
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
          0: '#FFFFFF', 50: '#F8F9FA', 100: '#F0F1F3', 200: '#E4E6E8',
          300: '#C8CDD2', 500: '#858B94', 700: '#60656D', 900: '#292B30',
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

> Tailwind 기본 `rose` 팔레트를 덮어쓴다. 임의의 기본 팔레트 대신 위에 정의된 중립 역할 변수만 사용한다.

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
2. **중립색은 한 계열로 통일한다.** 구분선, 비활성, 보조 텍스트는 위 `paper` ramp를 사용한다. 임의의 회색이나 크림색을 추가하지 않는다.
3. **흰 카드와 차콜 글씨를 사용한다.** 바탕은 `#F8F9FA`, 카드는 `#FFFFFF`, 본문은 `#292B30`. 순검정 글씨와 노란 기가 도는 배경은 사용하지 않는다.
4. **색만으로 의미를 전달하지 않는다.** 특히 error는 메인 색과 붉은 계열이 겹치므로 아이콘과 문구를 반드시 함께 표시한다.
5. **대비 기준(WCAG AA, 4.5:1)을 지킨다.**
   - `rose-400` 이하(더 밝은 단계), `peach` 전체, `paper-500`은 본문 텍스트로 쓰지 않는다.
   - warning solid(`#B07D22`) 위에는 흰 글씨를 올리지 않는다.
   - 다크 모드 주요 버튼 글씨는 흰색이 아니라 `#2A1513`이다.
6. **그라데이션, 강한 그림자를 쓰지 않는다.** 깊이는 `bg` → `surface` 밝기 차이와 얇은 `border`로 표현한다. 그림자가 필요하면 `rgba(41, 43, 48, 0.08)` 정도의 잉크색 기반 옅은 그림자만 쓴다.

## 8. (선택) 종이 질감

현재 구현은 깔끔한 바탕을 위해 질감을 사용하지 않는다. 아래는 향후 별도 요청이 있을 때만 참고한다.

```css
body {
  background-color: var(--color-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}
```

- 카드(`surface`)에는 질감을 넣지 않는다. 바탕에만 적용해 "종이 위에 놓인 종이" 대비를 만든다.
- 다크 모드에서는 opacity를 0.03 이하로 낮추거나 제거한다.

## 9. 프로젝트 적용 메모 (2026-11-08)

- 화면 색상은 `src/colors.css`의 역할 변수로 관리한다. 지도는 기존 친밀도(Lv) 의미를 유지하며 뉴트럴 → rose 색상 단계로 구분한다.
- 메뉴·지도 핀·추억·카메라·닫기·상태 표시는 `src/components/Icon.tsx`의 24px / 1.6px 둥근 선형 아이콘을 공통 사용한다.
- 기존 실제 간판 사진과 나침반 앱 아이콘 형태를 유지한다. PNG 앱 아이콘은 `node scripts/export-app-icons.mjs`로 같은 SVG와 컬러 토큰에서 다시 만든다.
- 참고: [Papier 노트 컬렉션](https://www.papier.com/stationery/notebooks/)의 사진과 캡션 구분, [DÔEN](https://www.shopdoen.com/)의 절제된 여백·사진 중심 구성. 색상 수치는 본 문서를 우선하며 외부 사진·로고·폰트는 가져오지 않았다.
- 그라데이션·배경 점무늬·반복적인 사진 기울임을 제거한다. 실제 사진, 얇은 중립색 선, 필요한 선택 표시로 화면의 밀도를 조절한다.
