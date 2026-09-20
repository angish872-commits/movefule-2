package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS005SystemOfflineScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_005",
        title = "System Offline",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_004,
        onNavigate = onNavigate,
    ) {
            MFNotice("You’re offline","Cached information remains available where safe. New changes may stay pending.","Retry")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS005SystemOfflineScreenPreview() {
    MoveFuelTheme { SYS005SystemOfflineScreen {} }
}
