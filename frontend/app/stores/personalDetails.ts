export const usePersonalDetailsStore = defineStore('personalDetails', () => {
    const name = ref('')
    const email = ref('')
    const phone = ref('')
    const description = ref('')
    const agreeToTerms = ref(false)
    const first_name = ref('')
    const last_name = ref('')

    return { first_name, last_name, email, phone, description, agreeToTerms }
})