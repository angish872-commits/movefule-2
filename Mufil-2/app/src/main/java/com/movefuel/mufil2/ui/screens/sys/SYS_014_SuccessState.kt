package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS014SuccessStateScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_014",
        title = "Success State",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_013,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Saved","Your change completed successfully.",MoveFuelColors.Success)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS014SuccessStateScreenPreview() {
    MoveFuelTheme { SYS014SuccessStateScreen {} }
}
