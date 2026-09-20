package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS002SystemEmptyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_002",
        title = "System Empty",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_001,
        onNavigate = onNavigate,
    ) {
            MFNotice("Nothing here yet","The empty state gives a clear next action instead of showing a blank screen.","Create first item")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS002SystemEmptyScreenPreview() {
    MoveFuelTheme { SYS002SystemEmptyScreen {} }
}
