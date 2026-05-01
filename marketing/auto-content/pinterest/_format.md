# Pinterest pin format reference

Each pin description below follows this format:

```
TITLE: <100 chars max — keyword-rich, scannable, benefit-led>
BODY: <500 chars max — natural search keywords, link-promoting>
KEYWORDS: <comma-separated tags Pinterest indexes against>
DESTINATION: <https://myveryown.page/start/<persona>>
IMAGE: <relative path to OG card we already generated>
BOARD: <suggested Pinterest board name>
```

## Posting workflow

**Manual (free):**
1. Pinterest → Create Pin
2. Upload image from `public/og/<persona>.png`
3. Paste TITLE in the pin title field
4. Paste BODY in the pin description field
5. Add destination link
6. Add 3-5 keywords as hashtags

**Bulk via Tailwind ($15/mo):**
1. Tailwind → Schedule → Bulk Upload
2. Map CSV columns: title → Title, body → Description, dest → Link, image → Pin Image
3. Distribute across boards via Tailwind's interval scheduler

**Cadence:** 5 pins/day max per board to avoid Pinterest's spam triggers.
Repin existing pins to multiple boards (with different copy) to multiply reach.
