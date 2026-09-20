package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS007SystemStaleScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_007",
        title = "System Stale",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_006,
        onNavigate = onNavigate,
    ) {
            MFNotice("Data may be stale","The last confirmed update is older than expected.","Refresh")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS007SystemStaleScreenPreview() {
    MoveFuelTheme { SYS007SystemStaleScreen {} }
}
