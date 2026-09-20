package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS019InterruptedFlowScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_019",
        title = "Interrupted Flow",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_020,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_018,
        onNavigate = onNavigate,
    ) {
            MFNotice("Flow interrupted","Your draft is preserved when possible. Resume or discard it explicitly.","Resume")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS019InterruptedFlowScreenPreview() {
    MoveFuelTheme { SYS019InterruptedFlowScreen {} }
}
