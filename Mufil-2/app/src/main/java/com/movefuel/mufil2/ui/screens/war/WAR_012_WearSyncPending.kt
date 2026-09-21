package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR012WearSyncPendingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_012",
        title = "Sync Pending",
        subtitle = "Performed workout facts are safely queued on the watch.",
        primaryLabel = "Retry sync",
        primaryRoute = MoveFuelRoute.WAR_012,
        secondaryLabel = "Back to Wear Today",
        secondaryRoute = MoveFuelRoute.WAR_001,
        onNavigate = onNavigate,
    ) {
        MFStageList(
            listOf("Saved on watch", "Waiting for phone", "Acknowledged"),
            activeIndex = 1,
        )
        MFNotice(
            "Keep the record",
            "The watch keeps performed facts until the phone/backend acknowledges them. This screen never jumps directly into phone Progress.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun WAR012WearSyncPendingScreenPreview() {
    MoveFuelTheme { WAR012WearSyncPendingScreen {} }
}
