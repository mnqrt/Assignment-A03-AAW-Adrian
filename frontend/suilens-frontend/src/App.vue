<template>
  <v-app>
    <v-main>
      <v-container>
        <h1 class="my-4">Lens Rental System</h1>

        <!-- WebSocket Status -->
        <v-card class="pa-4 mb-6">
          <v-chip :color="isConnected ? 'green' : 'red'" dark>
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </v-chip>
        </v-card>

        <!-- Latest Notification -->
        <v-card>
          <v-card-title>Latest Notification</v-card-title>
          <v-card-text>
            <div v-if="latestMessage">
              <pre>{{ JSON.stringify(latestMessage, null, 2) }}</pre>
            </div>
            <p v-else class="text-grey">No notification</p>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useWebSocket } from './composables/useWebSockets';

const { isConnected, latestMessage, connect, disconnect } = useWebSocket();

onMounted(() => connect());
onUnmounted(() => disconnect());
</script>