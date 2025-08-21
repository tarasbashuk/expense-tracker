# React-Intl Integration

## Overview

Додаток тепер підтримує інтернаціоналізацію за допомогою `react-intl` бібліотеки. Це дозволяє легко перемикатися між англійською та українською мовами.

## Структура файлів

### Переклади

```
src/locales/
├── en.json          # Англійські переклади
├── uk.json          # Українські переклади
└── index.ts         # Експорт та типи
```

### Контекст

Мова керується через розширений `SettingsContext`:

```
src/context/
└── SettingsContexts.tsx  # Розширений для підтримки locale
```

### Компоненти

Мова змінюється через існуючий `LanguageSelect` компонент на сторінці налаштувань.

## Використання

### 1. Формат повідомлень

Повідомлення використовують плоску структуру з точковою нотацією:

```json
{
  "settings.title": "Settings",
  "settings.language": "Language",
  "common.save": "Save"
}
```

### 2. В компонентах

#### FormattedMessage

```tsx
import { FormattedMessage } from 'react-intl';

<FormattedMessage id="settings.title" defaultMessage="Settings" />;
```

#### useIntl hook

```tsx
import { useIntl } from 'react-intl';

const intl = useIntl();
const title = intl.formatMessage({
  id: 'settings.title',
  defaultMessage: 'Settings',
});
```

#### Для динамічних значень

```tsx
<FormattedMessage
  id="greeting"
  defaultMessage="Hello, {name}!"
  values={{ name: 'John' }}
/>
```

### 3. Перемикання мови

Мова змінюється автоматично через `LanguageSelect` на сторінці налаштувань. При зміні мови в налаштуваннях:

1. Оновлюється мова в базі даних
2. Автоматично змінюється мова інтерфейсу
3. Мова синхронізується з налаштуваннями користувача

```tsx
// В Settings компоненті
const { settings, setLocale } = useSettings();

const handleLanguageChange = (event: SelectChangeEvent) => {
  const newLanguage = event.target.value as Language;
  setLanguage(newLanguage);
  // Також оновлюємо мову інтерфейсу
  setLocale(newLanguage === Language.ENG ? 'en' : 'uk');
};
```

## Підтримувані мови

- **en** - English (за замовчуванням)
- **uk** - Українська

## Збереження налаштувань

Мова зберігається в базі даних як частина налаштувань користувача і автоматично відновлюється при перезавантаженні сторінки.

## Додавання нових перекладів

1. Додайте ключі в `src/locales/en.json`
2. Додайте відповідні переклади в `src/locales/uk.json`
3. Використовуйте в компонентах через `FormattedMessage` або `useIntl`

## Приклад додавання нового перекладу

### 1. Додати в en.json

```json
{
  "newFeature.title": "New Feature",
  "newFeature.description": "This is a new feature"
}
```

### 2. Додати в uk.json

```json
{
  "newFeature.title": "Нова функція",
  "newFeature.description": "Це нова функція"
}
```

### 3. Використати в компоненті

```tsx
<FormattedMessage id="newFeature.title" defaultMessage="New Feature" />
```

## Наступні кроки

1. Додати переклади для всіх існуючих текстів
2. Оновити навігацію (Header, MobileAppBar)
3. Додати переклади для категорій транзакцій
4. Додати переклади для повідомлень про помилки
5. Інтегрувати з налаштуваннями користувача в базі даних
