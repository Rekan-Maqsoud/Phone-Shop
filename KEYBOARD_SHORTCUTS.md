# Keyboard Navigation & Shortcuts Documentation

This document outlines all the keyboard functionality added to the Phone Shop application for enhanced productivity and accessibility.

## Global Shortcuts (Available Everywhere)

| Shortcut | Action | Context |
|----------|--------|---------|
| `F1` | Show keyboard shortcuts modal | Global |
| `Ctrl+Shift+K` | Show keyboard shortcuts modal | Global |
| `Escape` | Close current modal/dialog | Modals |

## Admin Panel Navigation

### Section Navigation
| Shortcut | Action | Description |
|----------|--------|-------------|
| `↑` / `↓` | Navigate sections | Move between admin sections vertically |
| `←` / `→` | Navigate sections | Move between admin sections horizontally |
| `Ctrl+1` | Dashboard | Go to Multi-Currency Dashboard |
| `Ctrl+2` | Buying History | Go to Buying History |
| `Ctrl+3` | Sales History | Go to Sales History |
| `Ctrl+4` | Customer Debts | Go to Customer Debts |
| `Ctrl+5` | Company Debts | Go to Company Debts |
| `Ctrl+6` | Incentives | Go to Incentives |
| `Ctrl+7` | Products | Go to Active Products |
| `Ctrl+8` | Accessories | Go to Accessories Section |
| `Ctrl+9` | Archives | Go to Archived Items |
| `Ctrl+0` | Personal Loans | Go to Personal Loans |
| `Ctrl+R` | Monthly Reports | Go to Monthly Reports |
| `Ctrl+A` | Analytics | Go to Business Analytics |
| `Ctrl+B` | Backup Settings | Go to Backup & Settings |

### Header Actions
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+C` | Go to Cashier | Switch to Cashier interface |
| `Ctrl+Shift+S` | Settings | Open settings modal |
| `Ctrl+Shift+B` | Backup Manager | Open backup manager |

## Cashier Interface

### Core Functions
| Shortcut | Action | Description |
|----------|--------|-------------|
| `F2` | Complete Sale | Process the current sale |
| `F3` | Clear Cart | Remove all items from cart |
| `F4` | Toggle Debt Mode | Switch between cash and debt sales |
| `F5` | Toggle Multi-Currency | Enable/disable multi-currency mode |

### Currency & Pricing
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+1` | Set USD | Change currency to USD |
| `Ctrl+2` | Set IQD | Change currency to IQD |
| `Ctrl+D` | Toggle Discount | Apply/remove discount |
| `Ctrl++` | Increase Quantity | Increase item quantity |
| `Ctrl+-` | Decrease Quantity | Decrease item quantity |

### Search & Navigation
| Shortcut | Action | Description |
|----------|--------|-------------|
| `↑` / `↓` | Navigate Suggestions | Move through product suggestions |
| `Enter` | Select/Search | Select highlighted item or search |
| `Escape` | Clear Search | Clear search field and suggestions |
| `Ctrl+Shift+C` | Clear Customer | Clear customer name field |

## Return Modal

### Navigation & Actions
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Escape` | Close Modal | Cancel return process |
| `Ctrl+Enter` | Process Return | Complete the return |
| `Ctrl+1` | Return in USD | Set return currency to USD |
| `Ctrl+2` | Return in IQD | Set return currency to IQD |
| `Ctrl+M` | Toggle Multi-Currency | Switch currency modes |
| `↑` / `↓` | Adjust Quantity | Change return quantity (when not in input) |
| `Tab` | Navigate Fields | Move between input fields |

## Modal Dialogs

### Confirmation Modals
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Escape` | Cancel | Close modal without action |
| `Ctrl+Enter` | Confirm | Execute the confirmed action |
| `Tab` | Navigate Buttons | Switch between Cancel/Confirm |

## Keyboard Navigation Features

### Auto-Focus Management
- Modals automatically focus the most relevant input field
- Tab navigation follows logical field order
- Return to previous focus when modals close

### Context-Aware Shortcuts
- Number inputs handle arrow keys naturally
- Text inputs allow normal cursor movement
- Shortcuts respect input field focus state

### Visual Indicators
- Keyboard shortcuts shown in tooltips
- Active navigation highlighted with visual cues
- Shortcut hints displayed in relevant UI areas

## Accessibility Features

### Screen Reader Support
- All shortcuts have descriptive labels
- Focus management follows accessibility guidelines
- Visual focus indicators for all interactive elements

### Keyboard-Only Navigation
- Complete app functionality available via keyboard
- No mouse required for any operation
- Logical tab order throughout interface

## Implementation Details

### Custom Hooks
- `useKeyboardNavigation`: Universal keyboard handling
- `useAdminSectionNavigation`: Admin-specific navigation  
- `useModalKeyboardNavigation`: Modal-focused shortcuts
- `useCashierKeyboard`: Enhanced cashier shortcuts

### Components
- `KeyboardShortcutsModal`: Comprehensive shortcuts reference
- `KeyboardShortcutHint`: Inline shortcut indicators
- Enhanced existing modals with keyboard support

## Usage Tips

1. **Learning Path**: Start with `F1` to see all available shortcuts
2. **Admin Navigation**: Use arrow keys for quick section switching
3. **Cashier Efficiency**: Memorize F-key shortcuts for daily operations
4. **Return Processing**: Use `Ctrl+Enter` for quick confirmations
5. **Modal Navigation**: `Tab` through fields, `Escape` to cancel

## Browser Compatibility

All shortcuts are designed to work across modern browsers:
- Chrome, Firefox, Safari, Edge
- Handles both `Ctrl` (Windows/Linux) and `Cmd` (Mac)
- Respects browser-specific key combinations

## Future Enhancements

Potential additions for enhanced keyboard support:
- Vim-style navigation modes
- Custom shortcut configuration
- Voice command integration
- Gesture-based shortcuts for touch devices

---

*This keyboard system significantly improves productivity by allowing power users to navigate and operate the application entirely through keyboard shortcuts, while maintaining full compatibility with mouse and touch interactions.*
