package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS001SystemLoadingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_001",
        title = "System Loading",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_012,
        onNavigate = onNavigate,
    ) {
            MFSkeleton(240.dp,28.dp)
            MFSkeleton(358.dp,120.dp)
            MFSkeleton(358.dp,96.dp)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS001SystemLoadingScreenPreview() {
    MoveFuelTheme { SYS001SystemLoadingScreen {} }
}
