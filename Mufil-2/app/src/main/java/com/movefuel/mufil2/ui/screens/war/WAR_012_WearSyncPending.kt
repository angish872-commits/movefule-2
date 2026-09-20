package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR012WearSyncPendingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_012",
        title = "Wear Sync Pending",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_011,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Saved on watch","Waiting for phone","Acknowledged"),1)
            MFNotice("Do not discard","Performed facts stay on watch until the phone/backend acknowledges them.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR012WearSyncPendingScreenPreview() {
    MoveFuelTheme { WAR012WearSyncPendingScreen {} }
}
