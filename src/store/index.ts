export { useUIStore } from './ui.store'
export { useNotificationStore, notificationLabel } from './notification.store'
export { useSearchStore } from './search.store'              // Child A

// Stores từ Child Agents — thêm vào đây khi ghép từng module:
// export { useCalendarStore } from './calendar.store'          // Child B
// export { useCustomerProfileStore } from './customer-profile.store' // Child D
export { useChatStore } from './chat.store'                    // Child E
export { useCmsStore } from './cms.store'                      // Child F
