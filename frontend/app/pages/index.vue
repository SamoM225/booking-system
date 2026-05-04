<template>
  <div>
    <PageHero />

    <UMarquee :pause-on-hover="true">
      <UIcon name="i-simple-icons-github" class="size-10 shrink-0 text-blue-500" />
      <UIcon name="i-simple-icons-discord" class="size-10 shrink-0 text-blue-500" />
      <UIcon name="i-simple-icons-x" class="size-10 shrink-0 text-blue-500" />
      <UIcon name="i-simple-icons-instagram" class="size-10 shrink-0 text-blue-500" />
      <UIcon name="i-simple-icons-linkedin" class="size-10 shrink-0 text-blue-500" />
      <UIcon name="i-simple-icons-facebook" class="size-10 shrink-0 text-blue-500" />
    </UMarquee>
  </div>
  <UContainer class="pt-10">
    <Columns />
  </UContainer>

  <UContainer class="py-20">
    <UPageCTA
      title="Did we manage to change your mind?"
      description="Book your appointment today and take the first step towards feeling your best."
      variant="subtle"
      :links="[{
        label: 'Book right away',
        to: '/booking',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'lg'
      }, {
        label: 'Contact us',
        to: '/contact',
        color: 'neutral',
        variant: 'outline',
        size: 'lg'
      }]"
    />
  </UContainer>

  

</template>
